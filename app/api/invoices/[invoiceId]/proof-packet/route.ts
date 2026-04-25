import { NextRequest, NextResponse } from "next/server";

import { buildProofPacket } from "@/features/invoices/proof-packet";
import { getInvoiceByNumber } from "@/features/invoices/service";
import {
  AuthError,
  authErrorResponse,
  requireMerchantProfile,
} from "@/server/auth";

type ProofPacketRouteProps = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: ProofPacketRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { invoiceId } = await params;
    const invoice = await getInvoiceByNumber(
      authContext.merchantProfile.id,
      invoiceId,
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const packet = buildProofPacket(invoice);

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate proof packet.",
      },
      { status: 400 },
    );
  }
}
