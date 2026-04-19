import { NextRequest, NextResponse } from "next/server";

import {
  getMerchantProfileForUser,
  upsertMerchantProfile,
} from "@/features/merchant-profiles/service";
import type { UpsertMerchantProfileInput } from "@/features/merchant-profiles/types";
import { AuthError, authErrorResponse, requireAuthContext } from "@/server/auth";

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request);
    const profile = await getMerchantProfileForUser(authContext.user.id);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load merchant profile.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request);
    const body = (await request.json()) as UpsertMerchantProfileInput;
    const profile = await upsertMerchantProfile(authContext, body);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save merchant profile.",
      },
      { status: 400 },
    );
  }
}
