import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentIntentById,
  updatePaymentIntent,
  type UpdatePaymentIntentInput,
} from "@/lib/payment-intents";

type PaymentIntentRouteProps = {
  params: Promise<{
    intentId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  { params }: PaymentIntentRouteProps,
) {
  const { intentId } = await params;
  const intent = await getPaymentIntentById(intentId);

  if (!intent) {
    return NextResponse.json(
      { error: "Payment request not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ intent });
}

export async function PATCH(
  request: NextRequest,
  { params }: PaymentIntentRouteProps,
) {
  try {
    const { intentId } = await params;
    const body = (await request.json()) as UpdatePaymentIntentInput;
    const intent = await updatePaymentIntent(intentId, body);

    return NextResponse.json({ intent });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update payment request.",
      },
      { status: 400 },
    );
  }
}
