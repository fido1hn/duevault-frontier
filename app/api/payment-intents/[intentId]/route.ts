import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentIntentById,
  updatePaymentIntent,
} from "@/features/payment-intents/service";
import type { UpdatePaymentIntentInput } from "@/features/payment-intents/types";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";

type PaymentIntentRouteProps = {
  params: Promise<{
    intentId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: PaymentIntentRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { intentId } = await params;
    const intent = await getPaymentIntentById(
      authContext.merchantProfile.id,
      intentId,
    );

    if (!intent) {
      return NextResponse.json(
        { error: "Payment request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ intent });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Unable to load payment request." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: PaymentIntentRouteProps,
) {
  try {
    const authContext = await requireMerchantProfile(request);
    const { intentId } = await params;
    const body = (await request.json()) as UpdatePaymentIntentInput;
    const intent = await updatePaymentIntent(
      authContext.merchantProfile.id,
      intentId,
      body,
    );

    return NextResponse.json({ intent });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

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
