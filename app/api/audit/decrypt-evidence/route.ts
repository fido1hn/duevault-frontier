import { NextRequest, NextResponse } from "next/server";
import { createInMemorySigner } from "@umbra-privacy/sdk";

import {
  AuditServiceError,
  loadEvidenceForToken,
} from "@/features/audit/service";
import {
  AuditValidationError,
  parseGrantTokenPayload,
  parseTxSignature,
} from "@/features/audit/validators";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  isAuditorX25519Registered,
  queryDueVaultUserRegistration,
} from "@/lib/umbra/sdk";
import { AuthError, authErrorResponse, requireAuthContext } from "@/server/auth";
import { checkAuditDecryptRateLimit } from "@/server/audit-rate-limit";

const MAX_BODY_BYTES = 4_000;

class AuditBodyError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuditBodyError";
    this.status = status;
  }
}

async function readBody(request: Request): Promise<{
  token: unknown;
  txSignature: unknown;
}> {
  const contentLength = request.headers.get("content-length");

  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > MAX_BODY_BYTES
  ) {
    throw new AuditBodyError("Auditor request body is too large.", 413);
  }

  const body = await request.text();

  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    throw new AuditBodyError("Auditor request body is too large.", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AuditBodyError("Auditor request body must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AuditBodyError("Auditor request body must be a JSON object.");
  }

  const candidate = parsed as Record<string, unknown>;
  return { token: candidate.token, txSignature: candidate.txSignature };
}

function errorStatus(error: unknown): number {
  if (error instanceof AuditServiceError) return error.status;
  if (error instanceof AuditValidationError) return error.status;
  if (error instanceof AuditBodyError) return error.status;
  return 400;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request);
    const { token: rawToken, txSignature: rawTx } = await readBody(request);
    const token = parseGrantTokenPayload(rawToken);
    const txSignature = parseTxSignature(rawTx);
    const ownsAuditorWallet = authContext.solanaWallets.some(
      (wallet) => wallet.address === token.auditorAddress,
    );

    if (!ownsAuditorWallet) {
      return NextResponse.json(
        {
          error: "Sign in with the Solana wallet this grant was issued to.",
          code: "auditor_wallet_mismatch",
        },
        { status: 403 },
      );
    }

    const rateLimit = await checkAuditDecryptRateLimit({
      granterAddress: token.granterAddress,
      request,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: rateLimit.status,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    const runtimeConfig = getUmbraRuntimeConfig();
    const signer = await createInMemorySigner();
    let auditorAccount: Awaited<ReturnType<typeof queryDueVaultUserRegistration>>;

    try {
      auditorAccount = await queryDueVaultUserRegistration(
        {
          ...runtimeConfig,
          signer,
          deferMasterSeedSignature: true,
        },
        token.auditorAddress,
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Unable to verify auditor Umbra registration on ${runtimeConfig.network} RPC. ${error.message}`
              : `Unable to verify auditor Umbra registration on ${runtimeConfig.network} RPC.`,
          code: "auditor_x25519_check_failed",
        },
        { status: 502 },
      );
    }

    if (!isAuditorX25519Registered(auditorAccount)) {
      return NextResponse.json(
        {
          error:
            "Register an Umbra x25519 key for this auditor wallet before decrypting evidence.",
          code: "auditor_x25519_missing",
        },
        { status: 409 },
      );
    }

    const evidence = await loadEvidenceForToken(token, txSignature);
    return NextResponse.json({ evidence });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);

    const status = errorStatus(error);
    const payload: Record<string, string> = {
      error: errorMessage(error, "Unable to load evidence for this grant."),
    };
    if (error instanceof AuditServiceError) {
      payload.code = error.code;
    }
    return NextResponse.json(payload, { status });
  }
}
