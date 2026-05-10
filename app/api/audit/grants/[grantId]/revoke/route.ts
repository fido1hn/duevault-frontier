import { NextRequest, NextResponse } from "next/server";

import {
  AuditServiceError,
  markGrantRevokedForMerchant,
} from "@/features/audit/service";
import {
  AuditValidationError,
  parseRevokeGrantInput,
} from "@/features/audit/validators";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";
import { routeErrorResponse } from "@/server/route-errors";

type RevokeRouteProps = {
  params: Promise<{
    grantId: string;
  }>;
};

function errorStatus(error: unknown): number {
  if (error instanceof AuditServiceError) return error.status;
  if (error instanceof AuditValidationError) return error.status;
  return 400;
}

export async function POST(request: NextRequest, { params }: RevokeRouteProps) {
  try {
    const auth = await requireMerchantProfile(request);
    const { grantId } = await params;

    if (typeof grantId !== "string" || grantId.length === 0) {
      return NextResponse.json({ error: "Grant id is required." }, { status: 400 });
    }

    const body = await request.json();
    const { revocationSignature } = parseRevokeGrantInput(body);
    const grant = await markGrantRevokedForMerchant(
      auth.merchantProfile.id,
      grantId,
      revocationSignature,
    );

    return NextResponse.json({ grant });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return routeErrorResponse(error, "Unable to revoke compliance grant.", {
      action: "revoke_compliance_grant",
      route: "/api/audit/grants/[grantId]/revoke",
      status: errorStatus(error),
    });
  }
}
