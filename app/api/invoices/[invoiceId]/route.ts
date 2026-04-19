import { NextRequest, NextResponse } from "next/server";

import { getInvoiceByNumber } from "@/features/invoices/service";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";

type InvoiceRouteProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: InvoiceRouteProps) {
  try {
    const authContext = await requireMerchantProfile(_request);
    const { invoiceId } = await params;
    const invoice = await getInvoiceByNumber(
      authContext.merchantProfile.id,
      invoiceId,
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Unable to load invoice." },
      { status: 400 },
    );
  }
}
