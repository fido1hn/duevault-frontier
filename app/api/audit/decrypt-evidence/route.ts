import { NextRequest, NextResponse } from "next/server";

import {
  AuditServiceError,
  loadEvidenceForToken,
} from "@/features/audit/service";
import {
  AuditValidationError,
  parseGrantTokenPayload,
  parseTxSignature,
} from "@/features/audit/validators";
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
    const { token: rawToken, txSignature: rawTx } = await readBody(request);
    const token = parseGrantTokenPayload(rawToken);
    const txSignature = parseTxSignature(rawTx);

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

    const evidence = await loadEvidenceForToken(token, txSignature);
    return NextResponse.json({ evidence });
  } catch (error) {
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
