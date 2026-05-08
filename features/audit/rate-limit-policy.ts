export type AuditRateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    reset: number;
    pending?: Promise<unknown>;
  }>;
};

export type AuditDecryptLimiters = {
  ip: AuditRateLimiter;
  ipAndGranter: AuditRateLimiter;
  granter: AuditRateLimiter;
};

export type AuditRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 429 | 503;
      error: string;
      retryAfterSeconds?: number;
    };

const IDENTIFIER_PART_MAX_LENGTH = 128;

function getHeader(request: Pick<Request, "headers">, name: string) {
  return request.headers.get(name)?.trim() ?? "";
}

export function getAuditRateLimitClientIp(request: Pick<Request, "headers">) {
  const forwardedFor = getHeader(request, "x-forwarded-for")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);

  return (
    getHeader(request, "cf-connecting-ip") ||
    getHeader(request, "x-real-ip") ||
    forwardedFor ||
    "unknown"
  );
}

function normalizeIdentifierPart(value: string) {
  return value
    .trim()
    .slice(0, IDENTIFIER_PART_MAX_LENGTH)
    .replace(/[^A-Za-z0-9:._-]/g, "_");
}

function retryAfterSeconds(reset: number) {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

async function checkLimit(
  limiter: AuditRateLimiter,
  identifier: string,
): Promise<AuditRateLimitResult> {
  let result: Awaited<ReturnType<AuditRateLimiter["limit"]>>;

  try {
    result = await limiter.limit(identifier);
  } catch {
    return {
      allowed: false,
      status: 503,
      error: "Rate limiting is temporarily unavailable. Please try again shortly.",
      retryAfterSeconds: 30,
    };
  }

  if (result.pending) {
    void result.pending.catch(() => null);
  }

  if (result.success) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 429,
    error: "Too many auditor decrypt requests. Please wait and try again.",
    retryAfterSeconds: retryAfterSeconds(result.reset),
  };
}

export async function checkAuditDecryptRateLimitWithLimiters({
  isProduction = process.env.NODE_ENV === "production",
  limiters,
  granterAddress,
  request,
}: {
  isProduction?: boolean;
  limiters: AuditDecryptLimiters | null;
  granterAddress: string;
  request: Pick<Request, "headers">;
}): Promise<AuditRateLimitResult> {
  if (!limiters) {
    if (isProduction) {
      return {
        allowed: false,
        status: 503,
        error:
          "Auditor decrypt rate limiting is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.",
      };
    }

    return { allowed: true };
  }

  const ip = normalizeIdentifierPart(getAuditRateLimitClientIp(request));
  const granter = normalizeIdentifierPart(granterAddress);
  const checks = [
    [limiters.ip, `ip:${ip}`],
    [limiters.ipAndGranter, `ip:${ip}:granter:${granter}`],
    [limiters.granter, `granter:${granter}`],
  ] as const;

  for (const [limiter, identifier] of checks) {
    const result = await checkLimit(limiter, identifier);

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}
