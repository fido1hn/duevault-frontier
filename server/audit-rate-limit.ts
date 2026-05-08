import "server-only";

import { Ratelimit, type RatelimitConfig } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";

import {
  checkAuditDecryptRateLimitWithLimiters,
  type AuditDecryptLimiters,
  type AuditRateLimitResult,
  type AuditRateLimiter,
} from "@/features/audit/rate-limit-policy";

const RATE_LIMIT_PREFIX = "duevault:audit-decrypt";
const RATE_LIMIT_WINDOW = "10 m";
const IP_GLOBAL_LIMIT = 30;
const IP_GRANTER_LIMIT = 6;
const GRANTER_GLOBAL_LIMIT = 30;

let memoizedLimiters: AuditDecryptLimiters | null = null;

function hasKvEnv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function createRateLimiter(
  redis: RatelimitConfig["redis"],
  tokens: number,
  scope: string,
): AuditRateLimiter {
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
      ipAndGranter: createRateLimiter(kv, IP_GRANTER_LIMIT, "ip-granter"),
      granter: createRateLimiter(kv, GRANTER_GLOBAL_LIMIT, "granter"),
    };
  }

  return memoizedLimiters;
}

export async function checkAuditDecryptRateLimit({
  limiters = getDefaultLimiters(),
  granterAddress,
  request,
}: {
  limiters?: AuditDecryptLimiters | null;
  granterAddress: string;
  request: Pick<NextRequest, "headers">;
}): Promise<AuditRateLimitResult> {
  return checkAuditDecryptRateLimitWithLimiters({
    limiters,
    granterAddress,
    request,
  });
}
