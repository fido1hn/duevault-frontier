import { NextRequest, NextResponse } from "next/server";

import { serializePublicUmbraPaymentStatus } from "@/features/invoices/mappers";
import { getInvoiceByPublicId } from "@/features/invoices/service";

type CheckoutStatusRouteProps = {
  params: Promise<{
    publicId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: CheckoutStatusRouteProps,
) {
  const { publicId } = await params;
  const invoice = await getInvoiceByPublicId(publicId);

  if (!invoice) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }

  return NextResponse.json({
    invoice: {
      publicId: invoice.publicId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      privacyRail: invoice.privacyRail,
      latestUmbraPayment: serializePublicUmbraPaymentStatus(
        invoice.latestUmbraPayment,
      ),
    },
  });
}
