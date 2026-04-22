import { describe, expect, test } from "bun:test";

import { serializePublicUmbraPaymentStatus } from "../features/invoices/mappers.ts";

describe("public Umbra payment status serialization", () => {
  test("does not expose raw Umbra payment evidence", () => {
    const payment = {
      id: "payment_1",
      invoiceId: "invoice_1",
      merchantProfileId: "merchant_1",
      payerWalletAddress: "payer-wallet-address",
      merchantUmbraWalletAddress: "merchant-umbra-wallet-address",
      network: "mainnet",
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amountAtomic: "1000000",
      status: "submitted",
      optionalData: "a".repeat(64),
      closeProofAccountSignature: "close-proof-signature",
      createProofAccountSignature: "create-proof-signature",
      createUtxoSignature:
        "123456789abcdef123456789abcdef123456789abcdef123456789abcdef",
      error: null,
      confirmedAt: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
    };

    const publicStatus = serializePublicUmbraPaymentStatus(payment);
    const serialized = JSON.stringify(publicStatus);

    expect(publicStatus).toEqual({
      status: "submitted",
      confirmedAt: null,
      createUtxoSignaturePreview: "12345678...89abcdef",
    });
    expect(serialized).not.toContain(payment.payerWalletAddress);
    expect(serialized).not.toContain(payment.merchantUmbraWalletAddress);
    expect(serialized).not.toContain(payment.optionalData);
    expect(serialized).not.toContain(payment.createProofAccountSignature);
    expect(serialized).not.toContain(payment.createUtxoSignature);
  });
});
