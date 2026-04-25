import { describe, expect, test } from "bun:test";
import { buildProofPacket } from "../features/invoices/proof-packet.ts";

const FIXED_TS = "2026-04-25T12:00:00.000Z";

function confirmedPayment(overrides = {}) {
  return {
    id: "pay-1",
    invoiceId: "cuid-abc",
    merchantProfileId: "mp-1",
    payerWalletAddress: "PayerWallet456",
    merchantUmbraWalletAddress: "MerchUmbra123",
    network: "mainnet",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amountAtomic: "1500000000",
    status: "confirmed",
    optionalData: "a".repeat(64),
    closeProofAccountSignature: null,
    createProofAccountSignature: "proofSig123",
    createUtxoSignature: "utxoSig456",
    error: null,
    confirmedAt: "2026-04-25T10:00:00.000Z",
    createdAt: "2026-04-25T09:00:00.000Z",
    updatedAt: "2026-04-25T10:00:00.000Z",
    ...overrides,
  };
}

function makeInvoice(overrides = {}) {
  return {
    id: "INV-001",
    invoiceId: "cuid-abc",
    publicId: "pub-xyz",
    merchantProfileId: "mp-1",
    merchantName: "Acme Inc",
    merchantWalletAddress: "MerchWallet123",
    merchantUmbraNetwork: "mainnet",
    merchantUmbraStatus: "registered",
    merchantUmbraWalletAddress: "MerchUmbra123",
    invoiceNumber: "INV-001",
    client: "Bob Corp",
    clientEmail: "bob@example.com",
    issued: "Apr 01, 2026",
    due: "Apr 30, 2026",
    dueLong: "April 30, 2026",
    issuedAt: "2026-04-01T00:00:00.000Z",
    dueAt: "2026-04-30T00:00:00.000Z",
    amount: "1,500 USDC",
    amountNumber: 1500,
    amountAtomic: "1500000000",
    status: "Detected",
    notes: "Payment for services",
    paymentRail: "solana",
    privacyRail: "umbra",
    mint: "USDC",
    lineItems: [],
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    latestUmbraPayment: confirmedPayment(),
    ...overrides,
  };
}

describe("buildProofPacket", () => {
  test("builds a correct packet from a confirmed invoice", () => {
    const packet = buildProofPacket(makeInvoice(), FIXED_TS);

    expect(packet.version).toBe("1.0");
    expect(packet.generatedAt).toBe(FIXED_TS);

    expect(packet.invoice.id).toBe("INV-001");
    expect(packet.invoice.client).toBe("Bob Corp");
    expect(packet.invoice.clientEmail).toBe("bob@example.com");
    expect(packet.invoice.amount).toBe("1,500 USDC");
    expect(packet.invoice.amountAtomic).toBe("1500000000");
    expect(packet.invoice.mint).toBe("USDC");
    expect(packet.invoice.issued).toBe("Apr 01, 2026");
    expect(packet.invoice.due).toBe("Apr 30, 2026");
    expect(packet.invoice.notes).toBe("Payment for services");

    expect(packet.payment.network).toBe("mainnet");
    expect(packet.payment.payerWalletAddress).toBe("PayerWallet456");
    expect(packet.payment.merchantUmbraWalletAddress).toBe("MerchUmbra123");
    expect(packet.payment.createUtxoSignature).toBe("utxoSig456");
    expect(packet.payment.confirmedAt).toBe("2026-04-25T10:00:00.000Z");

    expect(packet.merchant.name).toBe("Acme Inc");
    expect(packet.merchant.walletAddress).toBe("MerchWallet123");
    expect(packet.merchant.umbraWalletAddress).toBe("MerchUmbra123");
  });

  test("throws when invoice has no umbra payment", () => {
    expect(() =>
      buildProofPacket(makeInvoice({ latestUmbraPayment: null }), FIXED_TS),
    ).toThrow("Invoice does not have a confirmed Umbra payment.");
  });

  test("throws when payment status is submitted", () => {
    expect(() =>
      buildProofPacket(
        makeInvoice({ latestUmbraPayment: confirmedPayment({ status: "submitted" }) }),
        FIXED_TS,
      ),
    ).toThrow("Invoice does not have a confirmed Umbra payment.");
  });

  test("throws when confirmedAt is null on a confirmed payment", () => {
    expect(() =>
      buildProofPacket(
        makeInvoice({ latestUmbraPayment: confirmedPayment({ confirmedAt: null }) }),
        FIXED_TS,
      ),
    ).toThrow("Invoice does not have a confirmed Umbra payment.");
  });

  test("merchant umbraWalletAddress is null when not set on invoice", () => {
    const packet = buildProofPacket(
      makeInvoice({ merchantUmbraWalletAddress: null }),
      FIXED_TS,
    );
    expect(packet.merchant.umbraWalletAddress).toBeNull();
  });
});
