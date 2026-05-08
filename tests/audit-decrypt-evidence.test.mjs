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

const { loadEvidenceForToken, AuditServiceError } = await import(
  "../features/audit/service.ts"
);
const { bytesToBase58 } = await import("../features/audit/mappers.ts");

const MERCHANT_ID = "mp_1";
const OTHER_MERCHANT_ID = "mp_2";
const GRANT_ID = "grant_1";
const GRANTER = "GranterAddr111111111111111111111111111111111";
const AUDITOR = "AuditorAddr111111111111111111111111111111111";
const TX_SIG = "u".repeat(80);
const INVOICE_ID = "inv_1";
const OTHER_INVOICE_ID = "inv_other";
const NONCE = "424242";

function makeKey(byte) {
  return new Uint8Array(32).fill(byte);
}

const GRANTER_KEY = makeKey(0xa1);
const AUDITOR_KEY = makeKey(0xb2);

function validToken(overrides = {}) {
  return {
    v: 1,
    grantId: GRANT_ID,
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519Base58: bytesToBase58(GRANTER_KEY),
    auditorX25519Base58: bytesToBase58(AUDITOR_KEY),
    grantNonce: NONCE,
    issuanceSignature: "i".repeat(80),
    ...overrides,
  };
}

function grantRecord(overrides = {}) {
  return {
    id: GRANT_ID,
    merchantProfileId: MERCHANT_ID,
    granterAddress: GRANTER,
    auditorAddress: AUDITOR,
    granterX25519: Buffer.from(GRANTER_KEY),
    auditorX25519: Buffer.from(AUDITOR_KEY),
    grantNonce: NONCE,
    issuanceSignature: "i".repeat(80),
    invoiceScopeIds: [],
    label: "Q4 2025",
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
    invoiceId: INVOICE_ID,
    merchantProfileId: MERCHANT_ID,
    payerWalletAddress: "PayerWallet111111111111111111111111111111111",
    merchantUmbraWalletAddress: "MerchUmbra111111111111111111111111111111111",
    network: "mainnet",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amountAtomic: "1500000000",
    status: "confirmed",
    optionalData: "a".repeat(64),
    closeProofAccountSignature: null,
    createProofAccountSignature: "p".repeat(80),
    createUtxoSignature: TX_SIG,
    confirmedAt: new Date("2026-05-08T11:00:00.000Z"),
    invoice: {
      id: INVOICE_ID,
      invoiceNumber: "INV-001",
      customerName: "Acme Co",
      customerEmail: "billing@acme.example",
      issuedAt: new Date("2026-05-01T00:00:00.000Z"),
      dueAt: new Date("2026-06-01T00:00:00.000Z"),
      mint: "USDC",
      totalAmountAtomic: "1500000000",
      notes: "Net 30.",
      lineItems: [
        {
          description: "Brand identity sprint",
          quantity: 2,
          unitAmountAtomic: "750000000",
          sortOrder: 0,
        },
      ],
    },
    merchantProfile: {
      id: MERCHANT_ID,
      businessName: "Maya Studios",
    },
    ...overrides,
  };
}

function resetMocks() {
  fakeDb.complianceGrant.findUnique.mockReset();
  fakeDb.umbraInvoicePayment.findUnique.mockReset();
}

describe("loadEvidenceForToken", () => {
  test("rejects with grant_invalid when grant id does not exist", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(null);

    let caught;
    try {
      await loadEvidenceForToken(validToken(), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AuditServiceError);
    expect(caught.code).toBe("grant_invalid");
    expect(fakeDb.umbraInvoicePayment.findUnique).not.toHaveBeenCalled();
  });

  test("rejects with grant_invalid when token nonce does not match DB row", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());

    let caught;
    try {
      await loadEvidenceForToken(validToken({ grantNonce: "999" }), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("grant_invalid");
    expect(fakeDb.umbraInvoicePayment.findUnique).not.toHaveBeenCalled();
  });

  test("rejects with grant_invalid when token X25519 key does not match DB row", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());

    let caught;
    try {
      await loadEvidenceForToken(
        validToken({ auditorX25519Base58: bytesToBase58(makeKey(0xff)) }),
        TX_SIG,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("grant_invalid");
  });

  test("rejects with grant_revoked when grant has revokedAt set", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(
      grantRecord({
        revokedAt: new Date("2026-05-09T00:00:00.000Z"),
        revocationSignature: "r".repeat(80),
      }),
    );

    let caught;
    try {
      await loadEvidenceForToken(validToken(), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("grant_revoked");
    expect(caught.status).toBe(403);
    expect(fakeDb.umbraInvoicePayment.findUnique).not.toHaveBeenCalled();
  });

  test("rejects with payment_not_found when txSignature is unknown", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());
    fakeDb.umbraInvoicePayment.findUnique.mockResolvedValueOnce(null);

    let caught;
    try {
      await loadEvidenceForToken(validToken(), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("payment_not_found");
    expect(caught.status).toBe(404);
  });

  test("rejects with payment_out_of_scope when payment belongs to a different merchant", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());
    fakeDb.umbraInvoicePayment.findUnique.mockResolvedValueOnce(
      paymentRecord({ merchantProfileId: OTHER_MERCHANT_ID }),
    );

    let caught;
    try {
      await loadEvidenceForToken(validToken(), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("payment_out_of_scope");
    expect(caught.status).toBe(403);
  });

  test("rejects with invoice_out_of_scope when invoiceScopeIds is set and excludes the invoice", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(
      grantRecord({ invoiceScopeIds: [OTHER_INVOICE_ID] }),
    );
    fakeDb.umbraInvoicePayment.findUnique.mockResolvedValueOnce(paymentRecord());

    let caught;
    try {
      await loadEvidenceForToken(validToken(), TX_SIG);
    } catch (error) {
      caught = error;
    }

    expect(caught.code).toBe("invoice_out_of_scope");
    expect(caught.status).toBe(403);
  });

  test("returns full evidence with line items on a valid request", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(grantRecord());
    fakeDb.umbraInvoicePayment.findUnique.mockResolvedValueOnce(paymentRecord());

    const evidence = await loadEvidenceForToken(validToken(), TX_SIG);

    expect(evidence.grant.id).toBe(GRANT_ID);
    expect(evidence.grant.label).toBe("Q4 2025");
    expect(evidence.grant.granterAddress).toBe(GRANTER);
    expect(evidence.grant.auditorAddress).toBe(AUDITOR);

    expect(evidence.payment.createUtxoSignature).toBe(TX_SIG);
    expect(evidence.payment.amountAtomic).toBe("1500000000");
    expect(evidence.payment.status).toBe("confirmed");
    expect(evidence.payment.confirmedAt).toBe("2026-05-08T11:00:00.000Z");

    expect(evidence.invoice.invoiceNumber).toBe("INV-001");
    expect(evidence.invoice.client).toBe("Acme Co");
    expect(evidence.invoice.clientEmail).toBe("billing@acme.example");
    expect(evidence.invoice.merchantBusinessName).toBe("Maya Studios");
    expect(evidence.invoice.totalAmountAtomic).toBe("1500000000");
    expect(evidence.invoice.notes).toBe("Net 30.");
    expect(evidence.invoice.mint).toBe("USDC");

    expect(evidence.invoice.lineItems).toHaveLength(1);
    const [item] = evidence.invoice.lineItems;
    expect(item.description).toBe("Brand identity sprint");
    expect(item.quantity).toBe(2);
    expect(item.unitAmountAtomic).toBe("750000000");
    expect(item.totalAtomic).toBe("1500000000");
  });

  test("includes the payment's invoice in scope when invoiceScopeIds includes its id", async () => {
    resetMocks();
    fakeDb.complianceGrant.findUnique.mockResolvedValueOnce(
      grantRecord({ invoiceScopeIds: [INVOICE_ID, OTHER_INVOICE_ID] }),
    );
    fakeDb.umbraInvoicePayment.findUnique.mockResolvedValueOnce(paymentRecord());

    const evidence = await loadEvidenceForToken(validToken(), TX_SIG);
    expect(evidence.invoice.invoiceNumber).toBe("INV-001");
  });
});
