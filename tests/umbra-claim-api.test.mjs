import { describe, expect, test } from "bun:test";

import {
  assertUmbraClaimPersistenceAllowed,
  parseUmbraClaimSettlementPayload,
} from "../features/invoices/claim-settlement.ts";

const SIGNATURE = "1".repeat(64);

function claimResult(overrides = {}) {
  return {
    completedBatchCount: 1,
    batches: [
      {
        batchIndex: "0",
        requestId: "claim_1",
        status: "completed",
        txSignature: "tx_sig",
        callbackSignature: "callback_sig",
        resolvedVariant: "claim_into_existing_shared_balance_v11",
        utxoIds: ["0:7"],
      },
    ],
    ...overrides,
  };
}

describe("Umbra claim settlement API helpers", () => {
  test("parses a completed claim payload", () => {
    expect(
      parseUmbraClaimSettlementPayload({
        createUtxoSignature: SIGNATURE,
        claimResult: claimResult(),
      }),
    ).toEqual({
      createUtxoSignature: SIGNATURE,
      claimResult: claimResult(),
    });
  });

  test("rejects empty and non-completed claim payloads", () => {
    expect(() =>
      parseUmbraClaimSettlementPayload({
        createUtxoSignature: SIGNATURE,
        claimResult: claimResult({ completedBatchCount: 0, batches: [] }),
      }),
    ).toThrow(/completed claim batch/);

    expect(() =>
      parseUmbraClaimSettlementPayload({
        createUtxoSignature: SIGNATURE,
        claimResult: claimResult({
          batches: [
            {
              batchIndex: "0",
              requestId: "claim_1",
              status: "failed",
            },
          ],
        }),
      }),
    ).toThrow(/completed claim batch/);

    expect(() =>
      parseUmbraClaimSettlementPayload({
        createUtxoSignature: SIGNATURE,
        claimResult: claimResult({ batches: [null] }),
      }),
    ).toThrow(/completed claim batch/);
  });

  test("allows confirmed merchant-owned payments and idempotent claimed invoices", () => {
    expect(
      assertUmbraClaimPersistenceAllowed({
        authMerchantProfileId: "merchant_1",
        invoiceMerchantProfileId: "merchant_1",
        invoiceStatus: "Detected",
        paymentStatus: "confirmed",
      }),
    ).toEqual({ alreadyClaimed: false });

    expect(
      assertUmbraClaimPersistenceAllowed({
        authMerchantProfileId: "merchant_1",
        invoiceMerchantProfileId: "merchant_1",
        invoiceStatus: "Claimed",
        paymentStatus: "confirmed",
      }),
    ).toEqual({ alreadyClaimed: true });
  });

  test("rejects wrong merchant and non-confirmed payments", () => {
    expect(() =>
      assertUmbraClaimPersistenceAllowed({
        authMerchantProfileId: "merchant_1",
        invoiceMerchantProfileId: "merchant_2",
        invoiceStatus: "Detected",
        paymentStatus: "confirmed",
      }),
    ).toThrow(/Invoice not found/);

    expect(() =>
      assertUmbraClaimPersistenceAllowed({
        authMerchantProfileId: "merchant_1",
        invoiceMerchantProfileId: "merchant_1",
        invoiceStatus: "Detected",
        paymentStatus: "submitted",
      }),
    ).toThrow(/Only confirmed/);
  });
});
