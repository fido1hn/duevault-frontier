import { describe, expect, test } from "bun:test";
import { Keypair } from "@solana/web3.js";

import {
  matchesUmbraPaymentSubmission,
  parseUmbraPaymentSavePayload,
  readUmbraPaymentSavePayload,
  validateCheckoutPublicId,
} from "../features/checkout/umbra-payment-save-validation.ts";

const SIGNATURE_A = "1".repeat(64);
const SIGNATURE_B = "2".repeat(64);
const SIGNATURE_C = "3".repeat(64);
const OPTIONAL_DATA = "a".repeat(64);

function address() {
  return Keypair.generate().publicKey.toBase58();
}

function validPayload(overrides = {}) {
  return {
    payerWalletAddress: address(),
    merchantUmbraWalletAddress: address(),
    mint: address(),
    network: "mainnet",
    amountAtomic: "1000000",
    optionalData: OPTIONAL_DATA,
    closeProofAccountSignature: SIGNATURE_A,
    createProofAccountSignature: SIGNATURE_B,
    createUtxoSignature: SIGNATURE_C,
    ...overrides,
  };
}

function validSubmission(overrides = {}) {
  const payload = parseUmbraPaymentSavePayload(validPayload());

  return {
    invoiceId: "invoice_1",
    merchantProfileId: "merchant_1",
    payerWalletAddress: payload.payerWalletAddress,
    merchantUmbraWalletAddress: payload.merchantUmbraWalletAddress,
    network: payload.network,
    mint: payload.mint,
    amountAtomic: payload.amountAtomic,
    optionalData: payload.optionalData,
    closeProofAccountSignature: payload.closeProofAccountSignature,
    createProofAccountSignature: payload.createProofAccountSignature,
    createUtxoSignature: payload.createUtxoSignature,
    ...overrides,
  };
}

describe("Umbra payment save request validation", () => {
  test("normalizes valid payloads", () => {
    expect(
      parseUmbraPaymentSavePayload(
        validPayload({
          closeProofAccountSignature: "",
          optionalData: OPTIONAL_DATA.toUpperCase(),
        }),
      ),
    ).toMatchObject({
      amountAtomic: "1000000",
      closeProofAccountSignature: null,
      optionalData: OPTIONAL_DATA,
      signatures: [SIGNATURE_B, SIGNATURE_C],
    });
  });

  test("rejects missing required signatures", () => {
    expect(() =>
      parseUmbraPaymentSavePayload(
        validPayload({ createProofAccountSignature: "" }),
      ),
    ).toThrow(/Create proof account signature is required/);
  });

  test("rejects malformed signatures", () => {
    for (const signature of [
      "0".repeat(64),
      "1".repeat(63),
      "1".repeat(89),
    ]) {
      expect(() =>
        parseUmbraPaymentSavePayload(
          validPayload({ createUtxoSignature: signature }),
        ),
      ).toThrow(/valid Solana transaction signature/);
    }
  });

  test("rejects duplicate signatures", () => {
    expect(() =>
      parseUmbraPaymentSavePayload(
        validPayload({ createUtxoSignature: SIGNATURE_B }),
      ),
    ).toThrow(/distinct/);
  });

  test("rejects invalid amount and optional data", () => {
    expect(() =>
      parseUmbraPaymentSavePayload(validPayload({ amountAtomic: "1.5" })),
    ).toThrow(/positive integer/);
    expect(() =>
      parseUmbraPaymentSavePayload(validPayload({ amountAtomic: "0" })),
    ).toThrow(/positive integer/);
    expect(() =>
      parseUmbraPaymentSavePayload(validPayload({ optionalData: "z".repeat(64) })),
    ).toThrow(/32-byte hex/);
    expect(() =>
      parseUmbraPaymentSavePayload(validPayload({ optionalData: "a".repeat(63) })),
    ).toThrow(/32-byte hex/);
  });

  test("rejects malformed public checkout ids", () => {
    expect(validateCheckoutPublicId("DV-1007")).toBe("DV-1007");
    expect(() => validateCheckoutPublicId("../DV-1007")).toThrow(/invalid/);
    expect(() => validateCheckoutPublicId("a".repeat(129))).toThrow(/invalid/);
  });

  test("rejects oversized JSON bodies before parsing", async () => {
    const request = new Request("https://example.test", {
      body: JSON.stringify({ payload: "x".repeat(10_001) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    await expect(readUmbraPaymentSavePayload(request)).rejects.toThrow(/too large/);
  });

  test("matches duplicate signatures only when every scoped field matches", () => {
    const existing = validSubmission();

    expect(matchesUmbraPaymentSubmission(existing, { ...existing })).toBe(true);
    expect(
      matchesUmbraPaymentSubmission(existing, {
        ...existing,
        invoiceId: "invoice_2",
      }),
    ).toBe(false);
    expect(
      matchesUmbraPaymentSubmission(existing, {
        ...existing,
        amountAtomic: "2000000",
      }),
    ).toBe(false);
  });
});
