import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const { AppRouteError, routeErrorResponse } = await import(
  "../server/route-errors.ts"
);
const { UmbraPaymentVerificationError } = await import(
  "../features/checkout/umbra-payment-verification.ts"
);

const originalConsoleError = console.error;

afterEach(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  console.error = mock();
});

async function responsePayload(response) {
  return response.json();
}

describe("routeErrorResponse", () => {
  test("hides unknown raw errors while logging debug detail", async () => {
    const response = routeErrorResponse(
      new Error("raw rpc detail: blockstore unavailable"),
      "Unable to save Umbra payment.",
      { route: "/api/checkout/[publicId]/umbra-payment", action: "save" },
    );
    const payload = await responsePayload(response);

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Unable to save Umbra payment.");
    expect(payload.error).not.toContain("blockstore");
    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify(console.error.mock.calls)).toContain(
      "blockstore unavailable",
    );
  });

  test("preserves explicit safe route errors", async () => {
    const response = routeErrorResponse(
      new AppRouteError({
        code: "invoice_not_ready",
        status: 409,
        userMessage: "Merchant Umbra setup is not ready.",
      }),
      "Unable to save Umbra payment.",
      { route: "/api/checkout/[publicId]/umbra-payment", action: "save" },
    );
    const payload = await responsePayload(response);

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      code: "invoice_not_ready",
      error: "Merchant Umbra setup is not ready.",
    });
  });

  test("maps pending Umbra verification to retryable checkout copy", async () => {
    const response = routeErrorResponse(
      new UmbraPaymentVerificationError(
        "RPC null result for Create UTXO 12345678: not yet indexed",
      ),
      "Unable to save Umbra payment.",
      { route: "/api/checkout/[publicId]/umbra-payment", action: "save" },
    );
    const payload = await responsePayload(response);

    expect(response.status).toBe(400);
    expect(payload.error).toBe(
      "We could not verify the Umbra transaction yet. Please wait a moment and try again.",
    );
  });

  test("maps Umbra verification mismatches to checkout mismatch copy", async () => {
    const response = routeErrorResponse(
      new UmbraPaymentVerificationError(
        "Umbra deposit event does not match this invoice reference.",
      ),
      "Unable to save Umbra payment.",
      { route: "/api/checkout/[publicId]/umbra-payment", action: "save" },
    );
    const payload = await responsePayload(response);

    expect(response.status).toBe(400);
    expect(payload.error).toBe("This Umbra payment does not match the invoice.");
  });
});
