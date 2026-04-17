import { NextRequest, NextResponse } from "next/server";

import { getInvoiceByNumber } from "@/lib/invoices";

type InvoiceRouteProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: InvoiceRouteProps) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceByNumber(invoiceId);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}
