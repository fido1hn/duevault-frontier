import { NextRequest, NextResponse } from "next/server";

import {
  AuditServiceError,
  getGrantForMerchant,
} from "@/features/audit/service";
import { AuditValidationError } from "@/features/audit/validators";
import { AuthError, authErrorResponse, requireMerchantProfile } from "@/server/auth";
import { routeErrorResponse } from "@/server/route-errors";

type GrantRouteProps = {
  params: Promise<{
    grantId: string;
  }>;
};

function errorStatus(error: unknown): number {
  if (error instanceof AuditServiceError) return error.status;
  if (error instanceof AuditValidationError) return error.status;
  return 400;
}

export async function GET(request: NextRequest, { params }: GrantRouteProps) {
  try {
    const auth = await requireMerchantProfile(request);
    const { grantId } = await params;

    if (typeof grantId !== "string" || grantId.length === 0) {
      return NextResponse.json({ error: "Grant id is required." }, { status: 400 });
    }

    const grant = await getGrantForMerchant(auth.merchantProfile.id, grantId);
    return NextResponse.json({ grant });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return routeErrorResponse(error, "Unable to load compliance grant.", {
      action: "get_compliance_grant",
      route: "/api/audit/grants/[grantId]",
      status: errorStatus(error),
    });
  }
}
