import { NextRequest, NextResponse } from "next/server";

import { createInvoice, listInvoices } from "@/features/invoices/service";
import type { CreateInvoiceInput } from "@/features/invoices/types";

export async function GET() {
  const invoices = await listInvoices();

  return NextResponse.json({ invoices });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateInvoiceInput;
    const invoice = await createInvoice(body);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create invoice.",
      },
      { status: 400 },
    );
  }
}
