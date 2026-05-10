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
import { AppRouteError, routeErrorResponse } from "@/server/route-errors";

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
      return routeErrorResponse(
        new AppRouteError(
          {
            code: "merchant_umbra_check_failed",
            status: 502,
            userMessage:
              "Unable to verify Umbra registration. Please try again in a moment.",
          },
          { cause: error },
        ),
        "Unable to save Umbra registration.",
        {
          action: "verify_merchant_umbra_registration",
          route: "/api/merchant-profile/umbra-registration",
        },
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

    return routeErrorResponse(error, "Unable to save Umbra registration.", {
      action: "save_merchant_umbra_registration",
      route: "/api/merchant-profile/umbra-registration",
    });
  }
}
