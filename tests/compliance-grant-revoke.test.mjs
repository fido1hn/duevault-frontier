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
  },
};

mock.module("@/server/db", () => ({ db: fakeDb }));

const { markGrantRevokedForMerchant, AuditServiceError } = await import(
  "../features/audit/service.ts"
);

const MERCHANT_ID = "mp_1";
const GRANT_ID = "grant_1";
const GRANTER = "GranterAddr111111111111111111111111111111111";
const AUDITOR = "AuditorAddr111111111111111111111111111111111";
const REVOCATION_SIG = "r".repeat(80);

function makeKey(byte) {
  return new Uint8Array(32).fill(byte);
}

function activeGrantRecord(overrides = {}) {
  return {
    id: GRANT_ID,
    merchantProfileId: MERCHANT_ID,
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519: Buffer.from(makeKey(0xa1)),
    auditorX25519: Buffer.from(makeKey(0xb2)),
    grantNonce: "42",
    issuanceSignature: "i".repeat(80),
    invoiceScopeIds: [],
    label: null,
    grantedAt: new Date("2026-05-08T10:00:00.000Z"),
    revokedAt: null,
    revocationSignature: null,
    createdAt: new Date("2026-05-08T10:00:00.000Z"),
    updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    ...overrides,
  };
}

describe("markGrantRevokedForMerchant", () => {
  test("rejects with grant_not_found when grant does not belong to merchant", async () => {
    fakeDb.complianceGrant.findFirst.mockReset();
    fakeDb.complianceGrant.update.mockReset();
    fakeDb.complianceGrant.findFirst.mockResolvedValueOnce(null);

    let caught;
    try {
      await markGrantRevokedForMerchant(MERCHANT_ID, GRANT_ID, REVOCATION_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AuditServiceError);
    expect(caught.code).toBe("grant_not_found");
    expect(caught.status).toBe(404);
    expect(fakeDb.complianceGrant.update).not.toHaveBeenCalled();
  });

  test("returns existing record without updating when already revoked (idempotent)", async () => {
    fakeDb.complianceGrant.findFirst.mockReset();
    fakeDb.complianceGrant.update.mockReset();
    const alreadyRevoked = activeGrantRecord({
      revokedAt: new Date("2026-05-09T08:00:00.000Z"),
      revocationSignature: "previous".padEnd(80, "x"),
    });
    fakeDb.complianceGrant.findFirst.mockResolvedValueOnce(alreadyRevoked);

    const result = await markGrantRevokedForMerchant(
      MERCHANT_ID,
      GRANT_ID,
      REVOCATION_SIG,
    );

    expect(result.status).toBe("revoked");
    expect(result.revokedAt).toBe("2026-05-09T08:00:00.000Z");
    expect(result.revocationSignature).toBe("previous".padEnd(80, "x"));
    expect(fakeDb.complianceGrant.update).not.toHaveBeenCalled();
  });

  test("sets revokedAt and revocationSignature when grant is active", async () => {
    fakeDb.complianceGrant.findFirst.mockReset();
    fakeDb.complianceGrant.update.mockReset();
    fakeDb.complianceGrant.findFirst.mockResolvedValueOnce(activeGrantRecord());
    fakeDb.complianceGrant.update.mockImplementationOnce(({ where, data }) =>
      Promise.resolve(
        activeGrantRecord({
          revokedAt: new Date("2026-05-09T08:00:00.000Z"),
          revocationSignature: data.revocationSignature,
        }),
      ),
    );

    const result = await markGrantRevokedForMerchant(
      MERCHANT_ID,
      GRANT_ID,
      REVOCATION_SIG,
    );

    expect(fakeDb.complianceGrant.update).toHaveBeenCalledTimes(1);
    const updateCall = fakeDb.complianceGrant.update.mock.calls[0][0];
    expect(updateCall.where.id).toBe(GRANT_ID);
    expect(updateCall.data.revocationSignature).toBe(REVOCATION_SIG);
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
    expect(result.status).toBe("revoked");
    expect(result.revocationSignature).toBe(REVOCATION_SIG);
  });

  test("scopes grant lookup by merchantProfileId", async () => {
    fakeDb.complianceGrant.findFirst.mockReset();
    fakeDb.complianceGrant.findFirst.mockResolvedValueOnce(null);

    try {
      await markGrantRevokedForMerchant(MERCHANT_ID, GRANT_ID, REVOCATION_SIG);
    } catch {
      // expected
    }

    const findCall = fakeDb.complianceGrant.findFirst.mock.calls[0][0];
    expect(findCall.where.id).toBe(GRANT_ID);
    expect(findCall.where.merchantProfileId).toBe(MERCHANT_ID);
  });
});
