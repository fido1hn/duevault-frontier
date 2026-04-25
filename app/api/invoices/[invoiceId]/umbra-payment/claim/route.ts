import { NextRequest, NextResponse } from "next/server";

import {
  assertUmbraClaimPersistenceAllowed,
  parseUmbraClaimSettlementPayload,
  UmbraClaimSettlementError,
} from "@/features/invoices/claim-settlement";
import { serializeInvoice } from "@/features/invoices/mappers";
import type {
  InvoiceStatus,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";
import { assertInvoiceStatus } from "@/features/invoices/validators";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";
import { db } from "@/server/db";

type ClaimUmbraPaymentRouteProps = {
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
  { params }: ClaimUmbraPaymentRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { invoiceId } = await params;
    const payload = parseUmbraClaimSettlementPayload(await request.json());
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

    assertInvoiceStatus(invoice.status);
    assertUmbraPaymentStatus(payment.status);

    const decision = assertUmbraClaimPersistenceAllowed({
      authMerchantProfileId: authContext.merchantProfile.id,
      invoiceMerchantProfileId: invoice.merchantProfileId,
      invoiceStatus: invoice.status as InvoiceStatus,
      paymentStatus: payment.status,
    });

    if (decision.alreadyClaimed) {
      return NextResponse.json({ invoice: serializeInvoice(invoice) });
    }

    const claimedAt = new Date();
    const updatedInvoice = await db.$transaction(async (tx) => {
      await tx.umbraInvoicePayment.update({
        where: {
          id: payment.id,
        },
        data: {
          claimedAt,
          claimResult: payload.claimResult,
        },
      });

      await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: "Claimed",
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: {
          id: invoice.id,
        },
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
            : "Unable to claim Umbra payment.",
      },
      { status: 400 },
    );
  }
}
