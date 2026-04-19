import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIntent,
  listPaymentIntents,
} from "@/features/payment-intents/service";
import type { CreatePaymentIntentInput } from "@/features/payment-intents/types";

export async function GET() {
  const intents = await listPaymentIntents();

  return NextResponse.json({ intents });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePaymentIntentInput;
    const intent = await createPaymentIntent(body);

    return NextResponse.json({ intent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create payment request.",
      },
      { status: 400 },
    );
  }
}
