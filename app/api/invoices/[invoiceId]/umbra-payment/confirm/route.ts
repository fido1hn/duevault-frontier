import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  buildUmbraInvoiceOptionalData,
} from "@/features/checkout/service";
import { decodeUmbraDepositEventsFromLogs } from "@/features/checkout/umbra-payment-verification";
import { serializeInvoice } from "@/features/invoices/mappers";
import type {
  ConfirmUmbraInvoicePaymentInput,
  InvoiceStatus,
} from "@/features/invoices/types";
import {
  assertInvoiceMint,
  assertInvoiceStatus,
} from "@/features/invoices/validators";
import { assertUmbraNetwork } from "@/features/merchant-profiles/validators";
import { resolvePaymentMintForNetwork } from "@/features/payments/mints";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";
import { db } from "@/server/db";

type ConfirmUmbraPaymentRouteProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

const FINAL_INVOICE_STATUSES = new Set<InvoiceStatus>([
  "Detected",
  "Paid",
  "Claimed",
  "Settled",
]);
const HEX_32_BYTE_PATTERN = /^[0-9a-f]{64}$/i;

function getRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function getRequiredHex(value: unknown, label: string) {
  const normalized = getRequiredString(value, label).toLowerCase();

  if (!HEX_32_BYTE_PATTERN.test(normalized)) {
    throw new Error(`${label} must be a 32-byte hex string.`);
  }

  return normalized;
}

function validatePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${label} must be a valid Solana address.`);
  }
}

function shouldMarkDetected(status: InvoiceStatus) {
  return !FINAL_INVOICE_STATUSES.has(status);
}

function parsePayload(payload: ConfirmUmbraInvoicePaymentInput) {
  return {
    createUtxoSignature: getRequiredString(
      payload.createUtxoSignature,
      "Create UTXO signature",
    ),
    destinationAddress: validatePublicKey(
      getRequiredString(payload.destinationAddress, "Destination address"),
      "Destination address",
    ),
    payerWalletAddress: validatePublicKey(
      getRequiredString(payload.payerWalletAddress, "Payer wallet address"),
      "Payer wallet address",
    ),
    mint: validatePublicKey(
      getRequiredString(payload.mint, "Payment mint"),
      "Payment mint",
    ),
    amountAtomic: getRequiredString(payload.amountAtomic, "Payment amount"),
    h1Hash: getRequiredHex(payload.h1Hash, "H1 hash"),
    h2Hash: getRequiredHex(payload.h2Hash, "H2 hash"),
    treeIndex: getRequiredString(payload.treeIndex, "Tree index"),
    insertionIndex: getRequiredString(payload.insertionIndex, "Insertion index"),
  };
}

export async function POST(
  request: NextRequest,
  { params }: ConfirmUmbraPaymentRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { invoiceId } = await params;
    const payload = parsePayload(
      (await request.json()) as ConfirmUmbraInvoicePaymentInput,
    );
    const invoice = await db.invoice.findUnique({
      where: {
        merchantProfileId_invoiceNumber: {
          merchantProfileId: authContext.merchantProfile.id,
          invoiceNumber: invoiceId,
        },
      },
      include: {
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        merchantProfile: {
          include: {
            primaryWallet: true,
          },
        },
        umbraPayments: {
          where: {
            createUtxoSignature: payload.createUtxoSignature,
          },
          take: 1,
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const payment = invoice.umbraPayments[0];

    if (!payment) {
      return NextResponse.json(
        { error: "Umbra payment submission not found for this invoice." },
        { status: 404 },
      );
    }

    if (payment.status === "confirmed") {
      return NextResponse.json({ invoice: serializeInvoice(invoice) });
    }

    if (payment.status !== "submitted") {
      return NextResponse.json(
        { error: "Only submitted Umbra payments can be confirmed." },
        { status: 409 },
      );
    }

    const runtimeConfig = getUmbraRuntimeConfig();
    assertInvoiceMint(invoice.mint);
    assertInvoiceStatus(invoice.status);
    assertUmbraNetwork(invoice.merchantProfile.umbraNetwork);

    const currentInvoiceStatus = invoice.status;
    const expectedMint = resolvePaymentMintForNetwork(
      invoice.mint,
      invoice.merchantProfile.umbraNetwork,
    );

    if (
      payment.network !== runtimeConfig.network ||
      invoice.merchantProfile.umbraNetwork !== runtimeConfig.network
    ) {
      return NextResponse.json(
        { error: "Umbra network does not match this checkout." },
        { status: 409 },
      );
    }

    if (
      payload.destinationAddress !== payment.merchantUmbraWalletAddress ||
      payload.destinationAddress !== invoice.merchantProfile.umbraWalletAddress
    ) {
      return NextResponse.json(
        { error: "Claimable UTXO destination does not match this merchant." },
        { status: 400 },
      );
    }

    if (
      payload.payerWalletAddress !== payment.payerWalletAddress ||
      payload.mint !== payment.mint ||
      payload.mint !== expectedMint.address ||
      payload.amountAtomic !== payment.amountAtomic
    ) {
      return NextResponse.json(
        { error: "Claimable UTXO evidence does not match this payment." },
        { status: 400 },
      );
    }

    if (payment.optionalData !== buildUmbraInvoiceOptionalData(invoice.publicId)) {
      return NextResponse.json(
        { error: "Invoice reference does not match this checkout." },
        { status: 400 },
      );
    }

    const connection = new Connection(runtimeConfig.rpcUrl, "confirmed");
    const transaction = await connection.getTransaction(payment.createUtxoSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction || !transaction.meta || transaction.meta.err !== null) {
      return NextResponse.json(
        { error: "Create UTXO transaction could not be verified on-chain." },
        { status: 400 },
      );
    }

    const matchingEvent = decodeUmbraDepositEventsFromLogs(
      transaction.meta.logMessages,
    ).find(
      (event) =>
        event.depositor === payment.payerWalletAddress &&
        event.mint === payment.mint &&
        event.transferAmountAtomic === payment.amountAtomic &&
        event.optionalData === payment.optionalData &&
        event.h1Hash === payload.h1Hash &&
        event.h2Hash === payload.h2Hash &&
        event.treeIndex === payload.treeIndex &&
        event.insertionIndexInTree === payload.insertionIndex,
    );

    if (!matchingEvent) {
      return NextResponse.json(
        {
          error:
            "Merchant claimable UTXO evidence does not match the submitted Umbra transaction.",
        },
        { status: 400 },
      );
    }

    const confirmedAt = new Date();

    const updatedInvoice = await db.$transaction(async (tx) => {
      await tx.umbraInvoicePayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "confirmed",
          confirmedAt,
          claimableH1Hash: payload.h1Hash,
          claimableH2Hash: payload.h2Hash,
          claimableTreeIndex: payload.treeIndex,
          claimableInsertionIndex: payload.insertionIndex,
        },
      });

      if (shouldMarkDetected(currentInvoiceStatus)) {
        await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: "Detected",
          },
        });
      }

      return tx.invoice.findUniqueOrThrow({
        where: {
          id: invoice.id,
        },
        include: {
          lineItems: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          merchantProfile: {
            include: {
              primaryWallet: true,
            },
          },
          umbraPayments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });
    });

    return NextResponse.json({ invoice: serializeInvoice(updatedInvoice) });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm Umbra payment.",
      },
      { status: 400 },
    );
  }
}
