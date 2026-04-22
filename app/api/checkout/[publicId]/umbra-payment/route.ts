import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

import { Prisma } from "@/generated/prisma/client";
import { buildUmbraInvoiceOptionalData } from "@/features/checkout/service";
import {
  matchesUmbraPaymentSubmission,
  parseUmbraPaymentSavePayload,
  readUmbraPaymentSavePayload,
  UmbraPaymentSaveValidationError,
  validateCheckoutPublicId,
} from "@/features/checkout/umbra-payment-save-validation";
import { verifyUmbraPaymentEvidence } from "@/features/checkout/umbra-payment-verification";
import { serializePublicUmbraPaymentStatus } from "@/features/invoices/mappers";
import { getInvoiceByPublicId } from "@/features/invoices/service";
import { resolvePaymentMintForNetwork } from "@/features/payments/mints";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import { db } from "@/server/db";
import { checkUmbraPaymentSaveRateLimit } from "@/server/umbra-payment-rate-limit";

type UmbraPaymentRouteProps = {
  params: Promise<{
    publicId: string;
  }>;
};

const CONFIRMED_STATUSES = new Set(["confirmed", "finalized"]);
const ACTIVE_UMBRA_PAYMENT_STATUSES = ["submitted", "confirmed"] as const;
const ACTIVE_UMBRA_PAYMENT_CONFLICT_ERROR =
  "This invoice already has an Umbra payment submission with a different signature.";

class UmbraPaymentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UmbraPaymentConflictError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function confirmSignatures(connection: Connection, signatures: string[]) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const statuses = await connection.getSignatureStatuses(signatures, {
      searchTransactionHistory: true,
    });
    const allConfirmed = statuses.value.every(
      (status) =>
        status &&
        status.err === null &&
        status.confirmationStatus &&
        CONFIRMED_STATUSES.has(status.confirmationStatus),
    );

    if (allConfirmed) {
      return;
    }

    if (attempt < 4) {
      await sleep(1_500);
    }
  }

  throw new Error("Umbra payment transactions are not confirmed yet.");
}

export async function POST(
  request: NextRequest,
  { params }: UmbraPaymentRouteProps,
) {
  const { publicId: rawPublicId } = await params;

  try {
    const publicId = validateCheckoutPublicId(rawPublicId);
    const payload = parseUmbraPaymentSavePayload(
      await readUmbraPaymentSavePayload(request),
    );
    const rateLimit = await checkUmbraPaymentSaveRateLimit({
      publicId,
      request,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: rateLimit.status,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    const invoice = await getInvoiceByPublicId(publicId);

    if (!invoice) {
      return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
    }

    if (invoice.privacyRail !== "umbra") {
      return NextResponse.json(
        { error: "This invoice does not use Umbra checkout." },
        { status: 400 },
      );
    }

    if (
      invoice.merchantUmbraStatus !== "ready" ||
      invoice.merchantUmbraWalletAddress !== invoice.merchantWalletAddress
    ) {
      return NextResponse.json(
        { error: "Merchant Umbra setup is not ready for this invoice." },
        { status: 409 },
      );
    }

    const runtimeConfig = getUmbraRuntimeConfig();
    let expectedMint: ReturnType<typeof resolvePaymentMintForNetwork>;

    try {
      expectedMint = resolvePaymentMintForNetwork(
        invoice.mint,
        invoice.merchantUmbraNetwork,
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Checkout mint is not supported for this Umbra network.",
        },
        { status: 409 },
      );
    }

    if (
      payload.network !== runtimeConfig.network ||
      payload.network !== invoice.merchantUmbraNetwork
    ) {
      return NextResponse.json(
        { error: "Umbra network does not match this checkout." },
        { status: 400 },
      );
    }

    if (payload.mint !== expectedMint.address) {
      return NextResponse.json(
        { error: "Payment mint does not match this checkout." },
        { status: 400 },
      );
    }

    if (payload.amountAtomic !== invoice.amountAtomic) {
      return NextResponse.json(
        { error: "Payment amount does not match this invoice." },
        { status: 400 },
      );
    }

    if (payload.merchantUmbraWalletAddress !== invoice.merchantUmbraWalletAddress) {
      return NextResponse.json(
        { error: "Merchant Umbra wallet does not match this invoice." },
        { status: 400 },
      );
    }

    if (payload.optionalData !== buildUmbraInvoiceOptionalData(invoice.publicId)) {
      return NextResponse.json(
        { error: "Invoice reference does not match this checkout." },
        { status: 400 },
      );
    }

    const expectedPayment = {
      invoiceId: invoice.invoiceId,
      merchantProfileId: invoice.merchantProfileId,
      payerWalletAddress: payload.payerWalletAddress,
      merchantUmbraWalletAddress: payload.merchantUmbraWalletAddress,
      network: payload.network,
      mint: payload.mint,
      amountAtomic: payload.amountAtomic,
      optionalData: payload.optionalData,
      closeProofAccountSignature: payload.closeProofAccountSignature,
      createProofAccountSignature: payload.createProofAccountSignature,
      createUtxoSignature: payload.createUtxoSignature,
    };

    const existingPayment = await db.umbraInvoicePayment.findUnique({
      where: {
        createUtxoSignature: payload.createUtxoSignature,
      },
    });

    if (existingPayment) {
      if (!matchesUmbraPaymentSubmission(existingPayment, expectedPayment)) {
        return NextResponse.json(
          {
            error:
              "This Umbra transaction signature is already attached to a different payment.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        invoice: {
          publicId: invoice.publicId,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
        },
        payment: serializePublicUmbraPaymentStatus(existingPayment),
      });
    }

    if (
      invoice.latestUmbraPayment?.status === "confirmed" ||
      invoice.latestUmbraPayment?.status === "submitted"
    ) {
      return NextResponse.json(
        {
          error:
            "This invoice already has an Umbra payment submission with a different signature.",
        },
        { status: 409 },
      );
    }

    const connection = new Connection(runtimeConfig.rpcUrl, "confirmed");

    await confirmSignatures(connection, payload.signatures);
    const verifiedEvidence = await verifyUmbraPaymentEvidence({
      connection,
      createProofAccountSignature: payload.createProofAccountSignature,
      createUtxoSignature: payload.createUtxoSignature,
      expected: {
        payerWalletAddress: payload.payerWalletAddress,
        mint: payload.mint,
        amountAtomic: payload.amountAtomic,
        optionalData: payload.optionalData,
      },
    });
    const verifiedPayment = {
      invoiceId: invoice.invoiceId,
      merchantProfileId: invoice.merchantProfileId,
      payerWalletAddress: verifiedEvidence.payerWalletAddress,
      merchantUmbraWalletAddress: payload.merchantUmbraWalletAddress,
      network: payload.network,
      mint: verifiedEvidence.mint,
      amountAtomic: verifiedEvidence.amountAtomic,
      optionalData: verifiedEvidence.optionalData,
      closeProofAccountSignature: payload.closeProofAccountSignature,
      createProofAccountSignature: payload.createProofAccountSignature,
      createUtxoSignature: payload.createUtxoSignature,
    };

    const payment = await db.$transaction(async (tx) => {
      const activePayment = await tx.umbraInvoicePayment.findFirst({
        where: {
          invoiceId: verifiedPayment.invoiceId,
          status: {
            in: [...ACTIVE_UMBRA_PAYMENT_STATUSES],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (activePayment) {
        if (matchesUmbraPaymentSubmission(activePayment, verifiedPayment)) {
          return activePayment;
        }

        throw new UmbraPaymentConflictError(
          ACTIVE_UMBRA_PAYMENT_CONFLICT_ERROR,
        );
      }

      const created = await tx.umbraInvoicePayment.create({
        data: {
          invoiceId: verifiedPayment.invoiceId,
          merchantProfileId: verifiedPayment.merchantProfileId,
          payerWalletAddress: verifiedPayment.payerWalletAddress,
          merchantUmbraWalletAddress: verifiedPayment.merchantUmbraWalletAddress,
          network: verifiedPayment.network,
          mint: verifiedPayment.mint,
          amountAtomic: verifiedPayment.amountAtomic,
          status: "submitted",
          optionalData: verifiedPayment.optionalData,
          closeProofAccountSignature: verifiedPayment.closeProofAccountSignature,
          createProofAccountSignature: verifiedPayment.createProofAccountSignature,
          createUtxoSignature: verifiedPayment.createUtxoSignature,
          confirmedAt: null,
        },
      });

      return created;
    }).catch(async (error) => {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }

      const activePayment = await db.umbraInvoicePayment.findFirst({
        where: {
          invoiceId: verifiedPayment.invoiceId,
          status: {
            in: [...ACTIVE_UMBRA_PAYMENT_STATUSES],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (activePayment && matchesUmbraPaymentSubmission(activePayment, verifiedPayment)) {
        return activePayment;
      }

      throw new UmbraPaymentConflictError(
        ACTIVE_UMBRA_PAYMENT_CONFLICT_ERROR,
      );
    });

    return NextResponse.json({
      invoice: {
        publicId: invoice.publicId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
      payment: serializePublicUmbraPaymentStatus(payment),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save Umbra payment.",
      },
      {
        status:
          error instanceof UmbraPaymentSaveValidationError
            ? error.status
            : error instanceof UmbraPaymentConflictError
              ? 409
              : 400,
      },
    );
  }
}
