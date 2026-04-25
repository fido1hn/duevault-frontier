import { address } from "@solana/kit";
import { splitAddressToLowHigh } from "@umbra-privacy/sdk/utils";

export type SettlementClaimEvidence = {
  destinationAddress: string;
  payerWalletAddress: string;
  mint: string;
  amountAtomic: string;
  h1Hash?: string | null;
  h2Hash?: string | null;
  treeIndex?: string | null;
  insertionIndex?: string | null;
};

type ClaimableSettlementUtxo = {
  amount: { toString(): string };
  destinationAddress: string;
  h1Hash: ArrayLike<number>;
  h2Hash: ArrayLike<number>;
  insertionIndex: { toString(): string };
  treeIndex: { toString(): string };
  h1Components: {
    mintAddressLow: bigint;
    mintAddressHigh: bigint;
    senderAddressLow: bigint;
    senderAddressHigh: bigint;
  };
};

type ClaimableSettlementScanResult<T extends ClaimableSettlementUtxo> = {
  received?: readonly T[];
  publicReceived?: readonly T[];
};

type ClaimBatchLike = {
  requestId?: string;
  status?: string;
  txSignature?: string;
  callbackSignature?: string;
  resolvedVariant?: string;
  failureReason?: string | null;
  utxoIds?: readonly string[];
};

type ClaimResultLike = {
  batches?: Map<unknown, ClaimBatchLike>;
} | null | undefined;

export type SettlementClaimResultSummary = {
  completedBatchCount: number;
  batches: Array<{
    batchIndex: string;
    requestId: string | null;
    status: string;
    txSignature: string | null;
    callbackSignature: string | null;
    resolvedVariant: string | null;
    utxoIds: string[];
  }>;
};

function bytesToHex(bytes: ArrayLike<number>) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function hasExactEvidence(evidence: SettlementClaimEvidence) {
  return Boolean(
    normalizeOptionalString(evidence.h1Hash) ||
      normalizeOptionalString(evidence.h2Hash) ||
      normalizeOptionalString(evidence.treeIndex) ||
      normalizeOptionalString(evidence.insertionIndex),
  );
}

function addressPartsMatch(
  candidateLow: bigint,
  candidateHigh: bigint,
  expectedAddress: string,
) {
  const expected = splitAddressToLowHigh(address(expectedAddress));

  return candidateLow === expected.low && candidateHigh === expected.high;
}

function matchesFallbackEvidence(
  utxo: ClaimableSettlementUtxo,
  evidence: SettlementClaimEvidence,
) {
  return (
    utxo.destinationAddress === evidence.destinationAddress &&
    utxo.amount.toString() === evidence.amountAtomic &&
    addressPartsMatch(
      utxo.h1Components.mintAddressLow,
      utxo.h1Components.mintAddressHigh,
      evidence.mint,
    ) &&
    addressPartsMatch(
      utxo.h1Components.senderAddressLow,
      utxo.h1Components.senderAddressHigh,
      evidence.payerWalletAddress,
    )
  );
}

function matchesExactEvidence(
  utxo: ClaimableSettlementUtxo,
  evidence: SettlementClaimEvidence,
) {
  const h1Hash = normalizeOptionalString(evidence.h1Hash)?.toLowerCase();
  const h2Hash = normalizeOptionalString(evidence.h2Hash)?.toLowerCase();
  const treeIndex = normalizeOptionalString(evidence.treeIndex);
  const insertionIndex = normalizeOptionalString(evidence.insertionIndex);

  return (
    (!h1Hash || bytesToHex(utxo.h1Hash) === h1Hash) &&
    (!h2Hash || bytesToHex(utxo.h2Hash) === h2Hash) &&
    (!treeIndex || utxo.treeIndex.toString() === treeIndex) &&
    (!insertionIndex || utxo.insertionIndex.toString() === insertionIndex)
  );
}

export function selectClaimableSettlementUtxos<T extends ClaimableSettlementUtxo>(
  scanned: ClaimableSettlementScanResult<T>,
  evidence: SettlementClaimEvidence,
) {
  const candidates = [
    ...(scanned.received ?? []),
    ...(scanned.publicReceived ?? []),
  ];
  const fallbackMatches = candidates.filter((utxo) =>
    matchesFallbackEvidence(utxo, evidence),
  );

  if (fallbackMatches.length === 0) {
    throw new Error("No claimable Umbra UTXO matched this invoice payment.");
  }

  if (!hasExactEvidence(evidence)) {
    return [fallbackMatches[0]];
  }

  const exactMatch = fallbackMatches.find((utxo) =>
    matchesExactEvidence(utxo, evidence),
  );

  if (!exactMatch) {
    throw new Error("No claimable Umbra UTXO matched this invoice evidence.");
  }

  return [exactMatch];
}

function batchIndexToString(value: unknown) {
  return typeof value === "bigint" ? value.toString() : String(value);
}

export function summarizeCompletedClaimResult(
  result: ClaimResultLike,
): SettlementClaimResultSummary {
  if (!result?.batches || result.batches.size === 0) {
    throw new Error("No Umbra claim batch completed for this settlement.");
  }

  const batches = [...result.batches.entries()].map(([batchIndex, batch]) => ({
    batchIndex: batchIndexToString(batchIndex),
    requestId: batch.requestId ?? null,
    status: batch.status ?? "unknown",
    txSignature: batch.txSignature ?? null,
    callbackSignature: batch.callbackSignature ?? null,
    resolvedVariant: batch.resolvedVariant ?? null,
    utxoIds: [...(batch.utxoIds ?? [])],
    failureReason: batch.failureReason ?? null,
  }));
  const failedBatch = batches.find((batch) => batch.status !== "completed");

  if (failedBatch) {
    throw new Error(
      failedBatch.failureReason ??
        `Umbra claim batch ${failedBatch.batchIndex} ended with status ${failedBatch.status}.`,
    );
  }

  const completedBatches = batches.filter(
    (batch) => batch.status === "completed",
  );

  if (completedBatches.length === 0) {
    throw new Error("No Umbra claim batch completed for this settlement.");
  }

  return {
    completedBatchCount: completedBatches.length,
    batches: completedBatches.map(({ failureReason: _failureReason, ...batch }) => batch),
  };
}
