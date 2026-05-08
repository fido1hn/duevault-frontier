import { NextRequest, NextResponse } from "next/server";

import {
  AuditServiceError,
  listGrantsForMerchant,
  persistIssuedGrantForMerchant,
} from "@/features/audit/service";
import {
  AuditValidationError,
  parsePersistIssuedGrantInput,
} from "@/features/audit/validators";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";

function errorStatus(error: unknown): number {
  if (error instanceof AuditServiceError) return error.status;
  if (error instanceof AuditValidationError) return error.status;
  return 400;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchantProfile(request);
    const grants = await listGrantsForMerchant(auth.merchantProfile.id);
    return NextResponse.json({ grants });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json(
      { error: errorMessage(error, "Unable to load compliance grants.") },
      { status: errorStatus(error) },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMerchantProfile(request);
    const merchantProfile = auth.merchantProfile;

    if (
      merchantProfile.umbraStatus !== "ready" ||
      !merchantProfile.umbraWalletAddress
    ) {
      return NextResponse.json(
        {
          error:
            "Set up Umbra in your merchant settings before issuing compliance grants.",
        },
        { status: 409 },
      );
    }

    const body = await request.json();
    const input = parsePersistIssuedGrantInput(body);
    const result = await persistIssuedGrantForMerchant(
      merchantProfile.id,
      merchantProfile.umbraWalletAddress,
      input,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json(
      { error: errorMessage(error, "Unable to record compliance grant.") },
      { status: errorStatus(error) },
    );
  }
}
