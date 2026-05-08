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

const { persistIssuedGrantForMerchant, AuditServiceError } = await import(
  "../features/audit/service.ts"
);
const {
  bytesToBase58,
  encodeGrantTokenForUrl,
  decodeGrantTokenFromUrl,
  serializeComplianceGrant,
} = await import("../features/audit/mappers.ts");

const MERCHANT_ID = "mp_1";
const GRANTER_ADDRESS = "GranterAddr111111111111111111111111111111111";
const AUDITOR_ADDRESS = "AuditorAddr111111111111111111111111111111111";

function makeKey(byte) {
  return new Uint8Array(32).fill(byte);
}

function validInput(overrides = {}) {
  return {
    granterAddress: GRANTER_ADDRESS,
    auditorAddress: AUDITOR_ADDRESS,
    granterX25519Base58: bytesToBase58(makeKey(0xa1)),
    auditorX25519Base58: bytesToBase58(makeKey(0xb2)),
    grantNonce: "1234567890",
    issuanceSignature: "5".repeat(80),
    invoiceScopeIds: [],
    label: "Q4 2025 — KPMG",
    ...overrides,
  };
}

function dbRecord(overrides = {}) {
  return {
    id: "grant_1",
    merchantProfileId: MERCHANT_ID,
    granterAddress: GRANTER_ADDRESS,
    auditorAddress: AUDITOR_ADDRESS,
    granterX25519: Buffer.from(makeKey(0xa1)),
    auditorX25519: Buffer.from(makeKey(0xb2)),
    grantNonce: "1234567890",
    issuanceSignature: "5".repeat(80),
    invoiceScopeIds: [],
    label: "Q4 2025 — KPMG",
    grantedAt: new Date("2026-05-08T10:00:00.000Z"),
    revokedAt: null,
    revocationSignature: null,
    createdAt: new Date("2026-05-08T10:00:00.000Z"),
    updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    ...overrides,
  };
}

describe("persistIssuedGrantForMerchant", () => {
  test("rejects when granterAddress does not match merchant Umbra wallet", async () => {
    fakeDb.complianceGrant.create.mockReset();

    let caught;
    try {
      await persistIssuedGrantForMerchant(MERCHANT_ID, "OtherWallet", validInput());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AuditServiceError);
    expect(caught.code).toBe("granter_mismatch");
    expect(caught.status).toBe(403);
    expect(fakeDb.complianceGrant.create).not.toHaveBeenCalled();
  });

  test("persists grant and returns serialized payload + token", async () => {
    fakeDb.complianceGrant.create.mockReset();
    fakeDb.complianceGrant.create.mockImplementation(({ data }) =>
      Promise.resolve(
        dbRecord({
          merchantProfileId: data.merchantProfileId,
          granterAddress: data.granterAddress,
          auditorAddress: data.auditorAddress,
          granterX25519: data.granterX25519,
          auditorX25519: data.auditorX25519,
          grantNonce: data.grantNonce,
          issuanceSignature: data.issuanceSignature,
          invoiceScopeIds: data.invoiceScopeIds,
          label: data.label,
        }),
      ),
    );

    const result = await persistIssuedGrantForMerchant(
      MERCHANT_ID,
      GRANTER_ADDRESS,
      validInput(),
    );

    const createCall = fakeDb.complianceGrant.create.mock.calls[0][0];
    expect(createCall.data.merchantProfileId).toBe(MERCHANT_ID);
    expect(createCall.data.granterAddress).toBe(GRANTER_ADDRESS);
    expect(createCall.data.auditorAddress).toBe(AUDITOR_ADDRESS);
    expect(createCall.data.granterX25519).toBeInstanceOf(Buffer);
    expect(createCall.data.granterX25519.length).toBe(32);
    expect(createCall.data.auditorX25519.length).toBe(32);
    expect(createCall.data.grantNonce).toBe("1234567890");
    expect(createCall.data.label).toBe("Q4 2025 — KPMG");
    expect(createCall.data.invoiceScopeIds).toEqual([]);

    expect(result.grant.id).toBe("grant_1");
    expect(result.grant.status).toBe("active");
    expect(result.grant.granterX25519Base58).toBe(bytesToBase58(makeKey(0xa1)));
    expect(result.grant.auditorX25519Base58).toBe(bytesToBase58(makeKey(0xb2)));

    expect(result.token.v).toBe(1);
    expect(result.token.grantId).toBe("grant_1");
    expect(result.token.granterAddress).toBe(GRANTER_ADDRESS);
    expect(result.token.auditorAddress).toBe(AUDITOR_ADDRESS);
    expect(result.token.grantNonce).toBe("1234567890");
  });
});

describe("serializeComplianceGrant", () => {
  test("status is 'active' when revokedAt is null", () => {
    const serialized = serializeComplianceGrant(dbRecord());
    expect(serialized.status).toBe("active");
    expect(serialized.revokedAt).toBeNull();
    expect(serialized.revocationSignature).toBeNull();
  });

  test("status is 'revoked' when revokedAt is set", () => {
    const serialized = serializeComplianceGrant(
      dbRecord({
        revokedAt: new Date("2026-05-09T08:00:00.000Z"),
        revocationSignature: "9".repeat(80),
      }),
    );
    expect(serialized.status).toBe("revoked");
    expect(serialized.revokedAt).toBe("2026-05-09T08:00:00.000Z");
    expect(serialized.revocationSignature).toBe("9".repeat(80));
  });

  test("encodes Bytes fields as base58 strings", () => {
    const serialized = serializeComplianceGrant(dbRecord());
    expect(serialized.granterX25519Base58).toBe(bytesToBase58(makeKey(0xa1)));
    expect(serialized.auditorX25519Base58).toBe(bytesToBase58(makeKey(0xb2)));
  });
});

describe("grant token URL roundtrip", () => {
  test("encodeGrantTokenForUrl + decodeGrantTokenFromUrl recover the same payload", () => {
    const token = {
      v: 1,
      grantId: "grant_xyz",
      granterAddress: GRANTER_ADDRESS,
      auditorAddress: AUDITOR_ADDRESS,
      granterX25519Base58: bytesToBase58(makeKey(0x11)),
      auditorX25519Base58: bytesToBase58(makeKey(0x22)),
      grantNonce: "987654321",
      issuanceSignature: "z".repeat(80),
    };

    const encoded = encodeGrantTokenForUrl(token);
    expect(encoded).not.toContain("=");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");

    const decoded = decodeGrantTokenFromUrl(encoded);
    expect(decoded).toEqual(token);
  });
});
