import { describe, expect, test } from "bun:test";
import { Keypair } from "@solana/web3.js";
import { address } from "@solana/kit";
import { splitAddressToLowHigh } from "@umbra-privacy/sdk/utils";

import {
  selectClaimableSettlementUtxos,
  summarizeCompletedClaimResult,
} from "../features/merchant-profiles/umbra-settlement-claim.ts";

function walletAddress() {
  return Keypair.generate().publicKey.toBase58();
}

function hexBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function addressParts(value) {
  return splitAddressToLowHigh(address(value));
}

function scannedUtxo({
  amountAtomic = "1000000",
  destinationAddress = walletAddress(),
  h1Hash = "a".repeat(64),
  h2Hash = "b".repeat(64),
  insertionIndex = "7",
  mint = walletAddress(),
  payerWalletAddress = walletAddress(),
  treeIndex = "0",
} = {}) {
  const mintParts = addressParts(mint);
  const payerParts = addressParts(payerWalletAddress);

  return {
    amount: BigInt(amountAtomic),
    destinationAddress,
    h1Hash: hexBytes(h1Hash),
    h2Hash: hexBytes(h2Hash),
    insertionIndex: BigInt(insertionIndex),
    treeIndex: BigInt(treeIndex),
    h1Components: {
      mintAddressLow: mintParts.low,
      mintAddressHigh: mintParts.high,
      senderAddressLow: payerParts.low,
      senderAddressHigh: payerParts.high,
    },
  };
}

function scanResult(overrides = {}) {
  return {
    selfBurnable: [],
    received: [],
    publicSelfBurnable: [],
    publicReceived: [],
    nextScanStartIndex: 0n,
    ...overrides,
  };
}

describe("settlement claim UTXO selection", () => {
  test("selects checkout UTXOs from publicReceived", () => {
    const destinationAddress = walletAddress();
    const payerWalletAddress = walletAddress();
    const mint = walletAddress();
    const target = scannedUtxo({ destinationAddress, payerWalletAddress, mint });

    expect(
      selectClaimableSettlementUtxos(
        scanResult({ publicReceived: [target] }),
        {
          destinationAddress,
          payerWalletAddress,
          mint,
          amountAtomic: "1000000",
        },
      ),
    ).toEqual([target]);
  });

  test("still supports received UTXOs", () => {
    const destinationAddress = walletAddress();
    const payerWalletAddress = walletAddress();
    const mint = walletAddress();
    const target = scannedUtxo({ destinationAddress, payerWalletAddress, mint });

    expect(
      selectClaimableSettlementUtxos(scanResult({ received: [target] }), {
        destinationAddress,
        payerWalletAddress,
        mint,
        amountAtomic: "1000000",
      }),
    ).toEqual([target]);
  });

  test("rejects a missing settlement UTXO instead of allowing false success", () => {
    expect(() =>
      selectClaimableSettlementUtxos(scanResult(), {
        destinationAddress: walletAddress(),
        payerWalletAddress: walletAddress(),
        mint: walletAddress(),
        amountAtomic: "1000000",
      }),
    ).toThrow(/No claimable Umbra UTXO matched this invoice/);
  });

  test("prefers exact claim evidence when multiple fallback matches exist", () => {
    const destinationAddress = walletAddress();
    const payerWalletAddress = walletAddress();
    const mint = walletAddress();
    const older = scannedUtxo({
      destinationAddress,
      payerWalletAddress,
      mint,
      h1Hash: "1".repeat(64),
      h2Hash: "2".repeat(64),
      insertionIndex: "4",
    });
    const target = scannedUtxo({
      destinationAddress,
      payerWalletAddress,
      mint,
      h1Hash: "3".repeat(64),
      h2Hash: "4".repeat(64),
      insertionIndex: "9",
    });

    expect(
      selectClaimableSettlementUtxos(
        scanResult({ publicReceived: [older, target] }),
        {
          destinationAddress,
          payerWalletAddress,
          mint,
          amountAtomic: "1000000",
          h1Hash: "3".repeat(64),
          h2Hash: "4".repeat(64),
          treeIndex: "0",
          insertionIndex: "9",
        },
      ),
    ).toEqual([target]);
  });
});

describe("settlement claim result summary", () => {
  test("summarizes completed claim batches", () => {
    expect(
      summarizeCompletedClaimResult({
        batches: new Map([
          [
            0n,
            {
              requestId: "claim_1",
              status: "completed",
              txSignature: "tx_sig",
              callbackSignature: "callback_sig",
              resolvedVariant: "claim_into_existing_shared_balance_v11",
              utxoIds: ["0:7"],
            },
          ],
        ]),
      }),
    ).toEqual({
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
    });
  });

  test("rejects empty and failed claim results", () => {
    expect(() => summarizeCompletedClaimResult(null)).toThrow(/No Umbra claim/);
    expect(() =>
      summarizeCompletedClaimResult({ batches: new Map() }),
    ).toThrow(/No Umbra claim/);
    expect(() =>
      summarizeCompletedClaimResult({
        batches: new Map([
          [
            0n,
            {
              requestId: "claim_1",
              status: "failed",
              failureReason: "relayer rejected proof",
            },
          ],
        ]),
      }),
    ).toThrow(/relayer rejected proof/);
  });
});
