import { NextRequest, NextResponse } from "next/server";

import { createInvoice, listInvoices } from "@/features/invoices/service";
import type { CreateInvoiceInput } from "@/features/invoices/types";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireMerchantProfile(request);
    const invoices = await listInvoices(authContext.merchantProfile.id);

    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Unable to load invoices." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireMerchantProfile(request);
    const body = (await request.json()) as CreateInvoiceInput;
    const invoice = await createInvoice(authContext.merchantProfile.id, body);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create invoice.",
      },
      { status: 400 },
    );
  }
}
