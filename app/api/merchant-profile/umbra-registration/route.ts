import { createInMemorySigner } from "@umbra-privacy/sdk";
import { NextRequest, NextResponse } from "next/server";

import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  isUmbraUserFullyRegistered,
  queryDueVaultUserRegistration,
} from "@/lib/umbra/sdk";
import { saveMerchantUmbraRegistration } from "@/features/merchant-profiles/service";
import type { SaveUmbraRegistrationInput } from "@/features/merchant-profiles/types";
import { sanitizeSaveUmbraRegistrationInput } from "@/features/merchant-profiles/validators";
import { AuthError, authErrorResponse, requireAuthContext } from "@/server/auth";

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request);
    const body = (await request.json()) as SaveUmbraRegistrationInput;
    const input = sanitizeSaveUmbraRegistrationInput(body);
    const merchantProfile = authContext.merchantProfile;

    if (!merchantProfile) {
      throw new AuthError("Merchant profile setup is required.", 403);
    }

    if (input.walletAddress !== merchantProfile.primaryWallet.address) {
      return NextResponse.json(
        {
          error: "Umbra wallet must match the merchant profile wallet.",
        },
        { status: 409 },
      );
    }

    const runtimeConfig = getUmbraRuntimeConfig();

    if (input.network !== runtimeConfig.network) {
      return NextResponse.json(
        {
          error: "Umbra network does not match server configuration.",
        },
        { status: 409 },
      );
    }

    const signer = await createInMemorySigner();
    let verifiedAccount: Awaited<
      ReturnType<typeof queryDueVaultUserRegistration>
    >;

    try {
      verifiedAccount = await queryDueVaultUserRegistration(
        {
          ...runtimeConfig,
          signer,
          deferMasterSeedSignature: true,
        },
        input.walletAddress,
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Unable to verify Umbra registration on ${runtimeConfig.network} RPC. ${error.message}`
              : `Unable to verify Umbra registration on ${runtimeConfig.network} RPC.`,
        },
        { status: 502 },
      );
    }

    if (!isUmbraUserFullyRegistered(verifiedAccount)) {
      return NextResponse.json(
        {
          error: "Umbra account is not fully registered on the configured network.",
        },
        { status: 409 },
      );
    }

    const profile = await saveMerchantUmbraRegistration(authContext, input);

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
            : "Unable to save Umbra registration.",
      },
      { status: 400 },
    );
  }
}
