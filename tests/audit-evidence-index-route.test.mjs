import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const AUDITOR = "AuditorAddr111111111111111111111111111111111";
const OTHER = "OtherWallet111111111111111111111111111111111";
const GRANTER = "GranterAddr111111111111111111111111111111111";
const TX_SIG = "u".repeat(80);

const requireAuthContext = mock();
const checkAuditDecryptRateLimit = mock();
const queryDueVaultUserRegistration = mock();
const realUmbraSdk = await import("../lib/umbra/sdk.ts");
const originalConsoleError = console.error;
const fakeDb = {
  complianceGrant: {
    findUnique: mock(),
  },
  umbraInvoicePayment: {
    findMany: mock(),
  },
};
class MockAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

mock.module("@/server/auth", () => ({
  AuthError: MockAuthError,
  authErrorResponse: (error) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
  requireAuthContext,
}));

mock.module("@/server/audit-rate-limit", () => ({
  checkAuditDecryptRateLimit,
}));

mock.module("@/server/db", () => ({ db: fakeDb }));

mock.module("@/lib/umbra/sdk", () => ({
  ...realUmbraSdk,
  isAuditorX25519Registered: (account) =>
    account.state === "exists" &&
    account.data?.isInitialised === true &&
    account.data?.isUserAccountX25519KeyRegistered === true,
  queryDueVaultUserRegistration,
}));

const { POST } = await import("../app/api/audit/evidence-index/route.ts");
const { bytesToBase58 } = await import("../features/audit/mappers.ts");

function token(overrides = {}) {
  return {
    v: 1,
    grantId: "grant_1",
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519Base58: bytesToBase58(new Uint8Array(32).fill(1)),
    auditorX25519Base58: bytesToBase58(new Uint8Array(32).fill(2)),
    grantNonce: "123",
    issuanceSignature: "i".repeat(80),
    ...overrides,
  };
}

function grantRecord(overrides = {}) {
  return {
    id: "grant_1",
    merchantProfileId: "mp_1",
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519: Buffer.from(new Uint8Array(32).fill(1)),
    auditorX25519: Buffer.from(new Uint8Array(32).fill(2)),
    grantNonce: "123",
    issuanceSignature: "i".repeat(80),
    invoiceScopeIds: [],
    paymentScopeSignatures: [TX_SIG],
    label: "Audit grant",
    grantedAt: new Date("2026-05-08T10:00:00.000Z"),
    revokedAt: null,
    revocationSignature: null,
    createdAt: new Date("2026-05-08T10:00:00.000Z"),
    updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    ...overrides,
  };
}

function paymentRecord(overrides = {}) {
  return {
    id: "pay_1",
    invoiceId: "inv_1",
    merchantProfileId: "mp_1",
    payerWalletAddress: "PayerWallet111111111111111111111111111111111",
    merchantUmbraWalletAddress: "MerchantUmbra1111111111111111111111111111",
    network: "mainnet",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amountAtomic: "1000000",
    status: "confirmed",
    optionalData: "a".repeat(64),
    closeProofAccountSignature: null,
    createProofAccountSignature: "p".repeat(80),
    createUtxoSignature: TX_SIG,
    confirmedAt: new Date("2026-05-08T11:00:00.000Z"),
    invoice: {
      id: "inv_1",
      invoiceNumber: "INV-001",
      customerName: "Maya Client",
      customerEmail: "client@example.com",
      issuedAt: new Date("2026-05-01T00:00:00.000Z"),
      dueAt: new Date("2026-06-01T00:00:00.000Z"),
      mint: "USDC",
      totalAmountAtomic: "1000000",
    },
    ...overrides,
  };
}

function request(body = { token: token() }) {
  return new Request("https://duevault.test/api/audit/evidence-index", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function registeredAccount() {
  return {
    state: "exists",
    data: {
      isInitialised: true,
      isUserAccountX25519KeyRegistered: true,
    },
  };
}

beforeEach(() => {
  console.error = mock();
  requireAuthContext.mockReset();
  checkAuditDecryptRateLimit.mockReset();
  queryDueVaultUserRegistration.mockReset();
  fakeDb.complianceGrant.findUnique.mockReset();
  fakeDb.umbraInvoicePayment.findMany.mockReset();

  requireAuthContext.mockResolvedValue({
    solanaWallets: [{ address: AUDITOR }],
  });
  checkAuditDecryptRateLimit.mockResolvedValue({ allowed: true });
  queryDueVaultUserRegistration.mockResolvedValue(registeredAccount());
  fakeDb.complianceGrant.findUnique.mockResolvedValue(grantRecord());
  fakeDb.umbraInvoicePayment.findMany.mockResolvedValue([paymentRecord()]);
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe("POST /api/audit/evidence-index", () => {
  test("returns 403 when authenticated user does not own auditor wallet", async () => {
    requireAuthContext.mockResolvedValue({
      solanaWallets: [{ address: OTHER }],
    });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe("auditor_wallet_mismatch");
    expect(fakeDb.umbraInvoicePayment.findMany).not.toHaveBeenCalled();
  });

  test("does not expose raw RPC errors when checking auditor registration", async () => {
    queryDueVaultUserRegistration.mockRejectedValue(
      new Error("raw rpc detail: upstream blockstore unavailable"),
    );

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.code).toBe("auditor_x25519_check_failed");
    expect(payload.error).toBe(
      "Unable to verify auditor Umbra registration. Please try again in a moment.",
    );
    expect(payload.error).not.toContain("blockstore");
    expect(fakeDb.umbraInvoicePayment.findMany).not.toHaveBeenCalled();
  });

  test("returns scoped evidence items for the matching registered auditor", async () => {
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].createUtxoSignature).toBe(TX_SIG);
  });
});
