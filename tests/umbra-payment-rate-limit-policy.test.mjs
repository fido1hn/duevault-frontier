import { describe, expect, test } from "bun:test";

import {
  checkUmbraPaymentSaveRateLimitWithLimiters,
  getUmbraPaymentRateLimitClientIp,
} from "../features/checkout/umbra-payment-rate-limit-policy.ts";

function requestWithHeaders(headers = {}) {
  return new Request("https://example.test", { headers });
}

function limiter({ calls, success = true, reset = Date.now() + 10_000 }) {
  return {
    limit: async (identifier) => {
      calls.push(identifier);

      return {
        success,
        reset,
      };
    },
  };
}

describe("Umbra payment save rate-limit policy", () => {
  test("extracts the public client IP from forwarding headers", () => {
    expect(
      getUmbraPaymentRateLimitClientIp(
        requestWithHeaders({
          "x-forwarded-for": "203.0.113.10, 10.0.0.2",
        }),
      ),
    ).toBe("203.0.113.10");
    expect(
      getUmbraPaymentRateLimitClientIp(
        requestWithHeaders({
          "cf-connecting-ip": "198.51.100.7",
          "x-forwarded-for": "203.0.113.10",
        }),
      ),
    ).toBe("198.51.100.7");
  });

  test("fails open without limiters outside production and closed in production", async () => {
    await expect(
      checkUmbraPaymentSaveRateLimitWithLimiters({
        isProduction: false,
        limiters: null,
        publicId: "invoice_1",
        request: requestWithHeaders(),
      }),
    ).resolves.toEqual({ allowed: true });

    await expect(
      checkUmbraPaymentSaveRateLimitWithLimiters({
        isProduction: true,
        limiters: null,
        publicId: "invoice_1",
        request: requestWithHeaders(),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      status: 503,
    });
  });

  test("checks IP, IP plus checkout, and checkout limit buckets", async () => {
    const calls = [];
    const limiters = {
      ip: limiter({ calls }),
      ipAndPublicId: limiter({ calls }),
      publicId: limiter({ calls }),
    };

    await expect(
      checkUmbraPaymentSaveRateLimitWithLimiters({
        limiters,
        publicId: "invoice_1",
        request: requestWithHeaders({
          "x-forwarded-for": "203.0.113.10, 10.0.0.2",
        }),
      }),
    ).resolves.toEqual({ allowed: true });
    expect(calls).toEqual([
      "ip:203.0.113.10",
      "ip:203.0.113.10:checkout:invoice_1",
      "checkout:invoice_1",
    ]);
  });

  test("returns 429 and stops when a limiter rejects", async () => {
    const calls = [];
    const limiters = {
      ip: limiter({ calls }),
      ipAndPublicId: limiter({
        calls,
        success: false,
        reset: Date.now() + 5_000,
      }),
      publicId: limiter({ calls }),
    };

    const result = await checkUmbraPaymentSaveRateLimitWithLimiters({
      limiters,
      publicId: "invoice_1",
      request: requestWithHeaders({
        "x-forwarded-for": "203.0.113.10",
      }),
    });

    expect(result).toMatchObject({
      allowed: false,
      status: 429,
    });
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(calls).toEqual([
      "ip:203.0.113.10",
      "ip:203.0.113.10:checkout:invoice_1",
    ]);
  });
});
