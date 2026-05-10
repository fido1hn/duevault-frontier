import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const WALLET = "MerchantWallet111111111111111111111111111111";
const requireAuthContext = mock();
const queryDueVaultUserRegistration = mock();
const saveMerchantUmbraRegistration = mock();
const originalConsoleError = console.error;

mock.module("@umbra-privacy/sdk", () => ({
  createInMemorySigner: mock(async () => ({ publicKey: "in-memory" })),
}));

mock.module("@/server/auth", () => ({
  AuthError: class MockAuthError extends Error {
    constructor(message, status = 401) {
      super(message);
      this.status = status;
    }
  },
  authErrorResponse: (error) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  requireAuthContext,
}));

mock.module("@/features/merchant-profiles/service", () => ({
  saveMerchantUmbraRegistration,
}));

mock.module("@/lib/umbra/sdk", () => ({
  isUmbraUserFullyRegistered: (account) =>
    account.state === "exists" &&
    account.data?.isInitialised === true &&
    account.data?.isUserAccountX25519KeyRegistered === true &&
    account.data?.isUserCommitmentRegistered === true &&
    account.data?.isActiveForAnonymousUsage === true,
  queryDueVaultUserRegistration,
}));

const { POST } = await import(
  "../app/api/merchant-profile/umbra-registration/route.ts"
);

function request() {
  return new Request("https://duevault.test/api/merchant-profile/umbra-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: {
        isActiveForAnonymousUsage: true,
        isInitialised: true,
        isUserAccountX25519KeyRegistered: true,
        isUserCommitmentRegistered: true,
        state: "exists",
      },
      network: "mainnet",
      signatures: [],
      walletAddress: WALLET,
    }),
  });
}

function registeredAccount() {
  return {
    state: "exists",
    data: {
      isActiveForAnonymousUsage: true,
      isInitialised: true,
      isUserAccountX25519KeyRegistered: true,
      isUserCommitmentRegistered: true,
    },
  };
}

beforeEach(() => {
  console.error = mock();
  requireAuthContext.mockReset();
  queryDueVaultUserRegistration.mockReset();
  saveMerchantUmbraRegistration.mockReset();

  requireAuthContext.mockResolvedValue({
    merchantProfile: {
      primaryWallet: {
        address: WALLET,
      },
    },
  });
  queryDueVaultUserRegistration.mockResolvedValue(registeredAccount());
  saveMerchantUmbraRegistration.mockResolvedValue({ id: "merchant_1" });
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe("POST /api/merchant-profile/umbra-registration", () => {
  test("does not expose raw RPC errors when verifying merchant registration", async () => {
    queryDueVaultUserRegistration.mockRejectedValue(
      new Error("raw rpc detail: upstream blockstore unavailable"),
    );

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.code).toBe("merchant_umbra_check_failed");
    expect(payload.error).toBe(
      "Unable to verify Umbra registration. Please try again in a moment.",
    );
    expect(payload.error).not.toContain("blockstore");
    expect(saveMerchantUmbraRegistration).not.toHaveBeenCalled();
  });

  test("saves a verified merchant Umbra registration", async () => {
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.id).toBe("merchant_1");
    expect(saveMerchantUmbraRegistration).toHaveBeenCalled();
  });
});
