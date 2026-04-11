import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIntent,
  listPaymentIntents,
  type CreatePaymentIntentInput,
} from "@/lib/payment-intents";

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
