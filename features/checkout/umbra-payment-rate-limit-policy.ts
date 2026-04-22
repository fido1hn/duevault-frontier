export type UmbraPaymentSaveRateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    reset: number;
    pending?: Promise<unknown>;
  }>;
};

export type UmbraPaymentSaveLimiters = {
  ip: UmbraPaymentSaveRateLimiter;
  ipAndPublicId: UmbraPaymentSaveRateLimiter;
  publicId: UmbraPaymentSaveRateLimiter;
};

export type UmbraPaymentRateLimitResult =
  | {
      allowed: true;
    }
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

export function getUmbraPaymentRateLimitClientIp(
  request: Pick<Request, "headers">,
) {
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
  limiter: UmbraPaymentSaveRateLimiter,
  identifier: string,
): Promise<UmbraPaymentRateLimitResult> {
  const result = await limiter.limit(identifier);

  if (result.pending) {
    void result.pending.catch(() => null);
  }

  if (result.success) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 429,
    error: "Too many Umbra payment submissions. Please wait and try again.",
    retryAfterSeconds: retryAfterSeconds(result.reset),
  };
}

export async function checkUmbraPaymentSaveRateLimitWithLimiters({
  isProduction = process.env.NODE_ENV === "production",
  limiters,
  publicId,
  request,
}: {
  isProduction?: boolean;
  limiters: UmbraPaymentSaveLimiters | null;
  publicId: string;
  request: Pick<Request, "headers">;
}): Promise<UmbraPaymentRateLimitResult> {
  if (!limiters) {
    if (isProduction) {
      return {
        allowed: false,
        status: 503,
        error:
          "Umbra payment submission rate limiting is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.",
      };
    }

    return { allowed: true };
  }

  const ip = normalizeIdentifierPart(
    getUmbraPaymentRateLimitClientIp(request),
  );
  const checkoutId = normalizeIdentifierPart(publicId);
  const checks = [
    [limiters.ip, `ip:${ip}`],
    [limiters.ipAndPublicId, `ip:${ip}:checkout:${checkoutId}`],
    [limiters.publicId, `checkout:${checkoutId}`],
  ] as const;

  for (const [limiter, identifier] of checks) {
    const result = await checkLimit(limiter, identifier);

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}
