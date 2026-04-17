import { NextRequest, NextResponse } from "next/server";

import {
  getMerchantProfileByWallet,
  upsertMerchantProfile,
} from "@/lib/merchant-profiles";
import type { UpsertMerchantProfileInput } from "@/lib/merchant-profile-types";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required." },
        { status: 400 },
      );
    }

    const profile = await getMerchantProfileByWallet(walletAddress);

    return NextResponse.json({ profile });
  } catch (error) {
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
    const body = (await request.json()) as UpsertMerchantProfileInput;
    const profile = await upsertMerchantProfile(body);

    return NextResponse.json({ profile });
  } catch (error) {
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
