import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIntent,
  listPaymentIntents,
} from "@/features/payment-intents/service";
import type { CreatePaymentIntentInput } from "@/features/payment-intents/types";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireMerchantProfile(request);
    const intents = await listPaymentIntents(authContext.merchantProfile.id);

    return NextResponse.json({ intents });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Unable to load payment requests." },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireMerchantProfile(request);
    const body = (await request.json()) as CreatePaymentIntentInput;
    const intent = await createPaymentIntent(
      authContext.merchantProfile.id,
      body,
    );

    return NextResponse.json({ intent }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

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
