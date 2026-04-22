import "server-only";

import { Ratelimit, type RatelimitConfig } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";
import {
  checkUmbraPaymentSaveRateLimitWithLimiters,
  type UmbraPaymentRateLimitResult,
  type UmbraPaymentSaveLimiters,
  type UmbraPaymentSaveRateLimiter,
} from "@/features/checkout/umbra-payment-rate-limit-policy";

const RATE_LIMIT_PREFIX = "duevault:umbra-save";
const RATE_LIMIT_WINDOW = "10 m";
const IP_GLOBAL_LIMIT = 60;
const IP_PUBLIC_ID_LIMIT = 6;
const PUBLIC_ID_GLOBAL_LIMIT = 30;

let memoizedLimiters: UmbraPaymentSaveLimiters | null = null;

function hasKvEnv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function createRateLimiter(
  redis: RatelimitConfig["redis"],
  tokens: number,
  scope: string,
): UmbraPaymentSaveRateLimiter {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, RATE_LIMIT_WINDOW),
    prefix: `${RATE_LIMIT_PREFIX}:${scope}`,
    timeout: 1_000,
    analytics: false,
  });
}

function getDefaultLimiters() {
  if (!hasKvEnv()) {
    return null;
  }

  if (!memoizedLimiters) {
    memoizedLimiters = {
      ip: createRateLimiter(kv, IP_GLOBAL_LIMIT, "ip"),
      ipAndPublicId: createRateLimiter(kv, IP_PUBLIC_ID_LIMIT, "ip-public-id"),
      publicId: createRateLimiter(kv, PUBLIC_ID_GLOBAL_LIMIT, "public-id"),
    };
  }

  return memoizedLimiters;
}

export async function checkUmbraPaymentSaveRateLimit({
  limiters = getDefaultLimiters(),
  publicId,
  request,
}: {
  limiters?: UmbraPaymentSaveLimiters | null;
  publicId: string;
  request: Pick<NextRequest, "headers">;
}): Promise<UmbraPaymentRateLimitResult> {
  return checkUmbraPaymentSaveRateLimitWithLimiters({
    limiters,
    publicId,
    request,
  });
}
