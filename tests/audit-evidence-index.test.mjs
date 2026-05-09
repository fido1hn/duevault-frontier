import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const fakeDb = {
  complianceGrant: {
    create: mock(),
    findUnique: mock(),
    findFirst: mock(),
    findMany: mock(),
    update: mock(),
  },
  umbraInvoicePayment: {
    findUnique: mock(),
    findMany: mock(),
  },
};

mock.module("@/server/db", () => ({ db: fakeDb }));

const { loadEvidenceIndexForToken, AuditServiceError } = await import(
  "../features/audit/service.ts"
);
const { bytesToBase58 } = await import("../features/audit/mappers.ts");

const MERCHANT_ID = "mp_1";
const GRANTER = "GranterAddr111111111111111111111111111111111";
const AUDITOR = "AuditorAddr111111111111111111111111111111111";
const TX_SIG = "u".repeat(80);
const OTHER_TX_SIG = "v".repeat(80);

function makeKey(byte) {
  return new Uint8Array(32).fill(byte);
}

function token(overrides = {}) {
  return {
    v: 1,
    grantId: "grant_1",
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519Base58: bytesToBase58(makeKey(0xa1)),
    auditorX25519Base58: bytesToBase58(makeKey(0xb2)),
    grantNonce: "123",
    issuanceSignature: "i".repeat(80),
    ...overrides,
  };
}

function grantRecord(overrides = {}) {
  return {
    id: "grant_1",
    merchantProfileId: MERCHANT_ID,
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519: Buffer.from(makeKey(0xa1)),
    auditorX25519: Buffer.from(makeKey(0xb2)),
    grantNonce: "123",
    issuanceSignature: "i".repeat(80),
    invoiceScopeIds: [],
    paymentScopeSignatures: [TX_SIG, OTHER_TX_SIG],
    label: "May audit",
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
    merchantProfileId: MERCHANT_ID,
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

function resetMocks() {
  fakeDb.complianceGrant.findUnique.mockReset();
  fakeDb.umbraInvoicePayment.findMany.mockReset();
}

describe("loadEvidenceIndexForToken", () => {
  test("returns lightweight evidence items for scoped payment signatures", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());
    fakeDb.umbraInvoicePayment.findMany.mockResolvedValueOnce([
      paymentRecord({ createUtxoSignature: TX_SIG }),
    ]);

    const items = await loadEvidenceIndexForToken(token());

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      createUtxoSignature: TX_SIG,
      invoiceNumber: "INV-001",
      client: "Maya Client",
      amountAtomic: "1000000",
      status: "confirmed",
    });
    expect(fakeDb.umbraInvoicePayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createUtxoSignature: { in: [TX_SIG, OTHER_TX_SIG] },
          merchantProfileId: MERCHANT_ID,
          status: "confirmed",
        }),
      }),
    );
  });

  test("rejects revoked grants before listing evidence", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(
      grantRecord({ revokedAt: new Date("2026-05-09T00:00:00.000Z") }),
    );

    let caught;
    try {
      await loadEvidenceIndexForToken(token());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AuditServiceError);
    expect(caught.code).toBe("grant_revoked");
    expect(fakeDb.umbraInvoicePayment.findMany).not.toHaveBeenCalled();
  });
});
