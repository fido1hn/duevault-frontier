import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

import { serializeUmbraInvoicePayment } from "../features/invoices/mappers.ts";

const MIGRATION_PATH =
  "prisma/migrations/20260426100000_umbra_claim_settlement_state/migration.sql";

function paymentRecord(overrides = {}) {
  return {
    id: "payment_1",
    invoiceId: "invoice_1",
    merchantProfileId: "merchant_1",
    payerWalletAddress: "payer",
    merchantUmbraWalletAddress: "merchant",
    network: "mainnet",
    mint: "mint",
    amountAtomic: "1000000",
    status: "confirmed",
    optionalData: "a".repeat(64),
    closeProofAccountSignature: null,
    createProofAccountSignature: "proof_sig",
    createUtxoSignature: "utxo_sig",
    error: null,
    confirmedAt: new Date("2026-04-26T08:00:00.000Z"),
    createdAt: new Date("2026-04-26T07:00:00.000Z"),
    updatedAt: new Date("2026-04-26T09:00:00.000Z"),
    ...overrides,
  };
}

describe("Umbra claim persistence", () => {
  test("migration adds claim evidence and claim completion fields", async () => {
    const migration = await readFile(MIGRATION_PATH, "utf8");

    for (const column of [
      "claimableH1Hash",
      "claimableH2Hash",
      "claimableTreeIndex",
      "claimableInsertionIndex",
      "claimedAt",
      "claimResult",
    ]) {
      expect(migration).toContain(`"${column}"`);
    }
    expect(migration).toContain("JSONB");
  });

  test("serializes stored claim evidence and claim result", () => {
    const claimResult = {
      completedBatchCount: 1,
      batches: [{ batchIndex: "0", status: "completed" }],
    };

    expect(
      serializeUmbraInvoicePayment(
        paymentRecord({
          claimableH1Hash: "1".repeat(64),
          claimableH2Hash: "2".repeat(64),
          claimableTreeIndex: "0",
          claimableInsertionIndex: "7",
          claimedAt: new Date("2026-04-26T10:00:00.000Z"),
          claimResult,
        }),
      ),
    ).toMatchObject({
      claimableH1Hash: "1".repeat(64),
      claimableH2Hash: "2".repeat(64),
      claimableTreeIndex: "0",
      claimableInsertionIndex: "7",
      claimedAt: "2026-04-26T10:00:00.000Z",
      claimResult,
    });
  });
});
