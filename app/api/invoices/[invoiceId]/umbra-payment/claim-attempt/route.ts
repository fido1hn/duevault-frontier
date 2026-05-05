import { NextRequest, NextResponse } from "next/server";

import {
  parseUmbraClaimAttemptPayload,
  UmbraClaimSettlementError,
} from "@/features/invoices/claim-settlement";
import { CLAIM_STATUS } from "@/features/invoices/constants";
import { serializeInvoice } from "@/features/invoices/mappers";
import type { SerializedUmbraInvoicePayment } from "@/features/invoices/types";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";
import { db } from "@/server/db";

type ClaimAttemptRouteProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

const invoiceInclude = {
  lineItems: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
  merchantProfile: {
    include: {
      primaryWallet: true,
    },
  },
  umbraPayments: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
};

function assertUmbraPaymentStatus(
  status: string,
): asserts status is SerializedUmbraInvoicePayment["status"] {
  if (status !== "confirmed" && status !== "failed" && status !== "submitted") {
    throw new UmbraClaimSettlementError("Invalid Umbra payment status.");
  }
}

export async function POST(
  request: NextRequest,
  { params }: ClaimAttemptRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { invoiceId } = await params;
    const payload = parseUmbraClaimAttemptPayload(await request.json());
    const invoice = await db.invoice.findUnique({
      where: {
        merchantProfileId_invoiceNumber: {
          merchantProfileId: authContext.merchantProfile.id,
          invoiceNumber: invoiceId,
        },
      },
      include: {
        ...invoiceInclude,
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

    if (invoice.status === "Claimed" || invoice.status === "Settled") {
      return NextResponse.json(
        { error: "Invoice has already been claimed." },
        { status: 409 },
      );
    }

    assertUmbraPaymentStatus(payment.status);

    if (payment.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed Umbra payments can be claimed." },
        { status: 409 },
      );
    }

    if (payload.phase === "started") {
      if (payment.claimStatus === CLAIM_STATUS.Confirmed) {
        return NextResponse.json(
          { error: "This payment has already been claimed." },
          { status: 409 },
        );
      }

      const updatedInvoice = await db.$transaction(async (tx) => {
        await tx.umbraInvoicePayment.update({
          where: { id: payment.id },
          data: {
            claimStatus: CLAIM_STATUS.Pending,
            claimAttempts: { increment: 1 },
            claimLastAttemptedAt: new Date(),
            claimLastError: null,
          },
        });

        return tx.invoice.findUniqueOrThrow({
          where: { id: invoice.id },
          include: invoiceInclude,
        });
      });

      return NextResponse.json({ invoice: serializeInvoice(updatedInvoice) });
    }

    if (payment.claimStatus !== CLAIM_STATUS.Pending) {
      return NextResponse.json(
        { error: "No claim attempt is currently in flight to mark failed." },
        { status: 409 },
      );
    }

    const updatedInvoice = await db.$transaction(async (tx) => {
      await tx.umbraInvoicePayment.update({
        where: { id: payment.id },
        data: {
          claimStatus: CLAIM_STATUS.Failed,
          claimLastError: payload.error,
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: invoiceInclude,
      });
    });

    return NextResponse.json({ invoice: serializeInvoice(updatedInvoice) });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    if (error instanceof UmbraClaimSettlementError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record claim attempt.",
      },
      { status: 400 },
    );
  }
}
