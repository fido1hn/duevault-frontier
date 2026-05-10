"use client";

import { getClaimableUtxoScannerFunction } from "@umbra-privacy/sdk";
import type { ScannedUtxoData } from "@umbra-privacy/sdk/interfaces";
import type { MasterSeed, U32 } from "@umbra-privacy/sdk/types";
import { splitAddressToLowHigh } from "@umbra-privacy/sdk/utils";
import { address } from "@solana/kit";
import { Connection } from "@solana/web3.js";
import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { decodeUmbraDepositEventsFromLogs } from "@/features/checkout/umbra-payment-verification";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  createDueVaultClient,
  type DueVaultConfig,
} from "@/lib/umbra/sdk";

export type MerchantUmbraClaimabilityEvidence = {
  destinationAddress: string;
  payerWalletAddress: string;
  mint: string;
  amountAtomic: string;
  h1Hash: string;
  h2Hash: string;
  treeIndex: string;
  insertionIndex: string;
};

type FindMerchantClaimableUmbraPaymentInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  expected: {
    destinationAddress: string;
    payerWalletAddress: string;
    mint: string;
    amountAtomic: string;
    createUtxoSignature: string;
    optionalData: string;
  };
  masterSeedStorage?: DueVaultConfig["masterSeedStorage"];
};

type GroundTruthIndices = {
  treeIndex: string;
  insertionIndex: string;
};

export function createClickScopedMasterSeedStorage(): NonNullable<
  DueVaultConfig["masterSeedStorage"]
> {
  let cachedSeed: MasterSeed | null = null;

  return {
    load: async () =>
      cachedSeed
        ? {
            exists: true as const,
            seed: cachedSeed,
          }
        : {
            exists: false as const,
          },
    store: async (seed) => {
      cachedSeed = seed;

      return {
        success: true as const,
      };
    },
  };
}


function bytesToHex(bytes: ArrayLike<number>) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
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

function utxoMatchesExpected(
  utxo: ScannedUtxoData,
  expected: FindMerchantClaimableUmbraPaymentInput["expected"],
  indices: GroundTruthIndices,
) {
  return (
    utxo.treeIndex.toString() === indices.treeIndex &&
    utxo.insertionIndex.toString() === indices.insertionIndex &&
    utxo.destinationAddress === expected.destinationAddress &&
    utxo.amount.toString() === expected.amountAtomic &&
    addressPartsMatch(
      utxo.h1Components.mintAddressLow,
      utxo.h1Components.mintAddressHigh,
      expected.mint,
    ) &&
    addressPartsMatch(
      utxo.h1Components.senderAddressLow,
      utxo.h1Components.senderAddressHigh,
      expected.payerWalletAddress,
    )
  );
}

async function fetchGroundTruthIndices(
  rpcUrl: string,
  expected: FindMerchantClaimableUmbraPaymentInput["expected"],
): Promise<GroundTruthIndices> {
  const connection = new Connection(rpcUrl, "confirmed");
  const transaction = await connection.getTransaction(
    expected.createUtxoSignature,
    {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    },
  );

  if (!transaction || !transaction.meta || transaction.meta.err !== null) {
    throw new Error(
      "Could not load the Umbra create-UTXO transaction yet — try again in a few seconds.",
    );
  }

  const event = decodeUmbraDepositEventsFromLogs(
    transaction.meta.logMessages,
  ).find(
    (candidate) =>
      candidate.depositor === expected.payerWalletAddress &&
      candidate.mint === expected.mint &&
      candidate.transferAmountAtomic === expected.amountAtomic &&
      candidate.optionalData === expected.optionalData,
  );

  if (!event || !event.treeIndex || !event.insertionIndexInTree) {
    throw new Error(
      "Could not locate the Umbra deposit event for this payment.",
    );
  }

  return {
    treeIndex: event.treeIndex,
    insertionIndex: event.insertionIndexInTree,
  };
}

function serializeClaimabilityEvidence(
  utxo: ScannedUtxoData,
  expected: FindMerchantClaimableUmbraPaymentInput["expected"],
): MerchantUmbraClaimabilityEvidence {
  return {
    destinationAddress: expected.destinationAddress,
    payerWalletAddress: expected.payerWalletAddress,
    mint: expected.mint,
    amountAtomic: expected.amountAtomic,
    h1Hash: bytesToHex(utxo.h1Hash),
    h2Hash: bytesToHex(utxo.h2Hash),
    treeIndex: utxo.treeIndex.toString(),
    insertionIndex: utxo.insertionIndex.toString(),
  };
}

export async function findMerchantClaimableUmbraPayment({
  expected,
  wallet,
  signTransaction,
  signMessage,
  masterSeedStorage,
}: FindMerchantClaimableUmbraPaymentInput) {
  const runtimeConfig = getUmbraRuntimeConfig();
  const indices = await fetchGroundTruthIndices(runtimeConfig.rpcUrl, expected);
  const signer = createPrivyUmbraSigner({
    wallet,
    signTransaction,
    signMessage,
  });
  const client = await createDueVaultClient({
    ...runtimeConfig,
    signer,
    masterSeedStorage:
      masterSeedStorage ?? createClickScopedMasterSeedStorage(),
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
  });
  const scanClaimableUtxos = getClaimableUtxoScannerFunction({ client });
  const scanned = await scanClaimableUtxos(0n as U32, 0n as U32);
  const match = [...scanned.received, ...scanned.publicReceived].find((utxo) =>
    utxoMatchesExpected(utxo, expected, indices),
  );

  if (!match) {
    throw new Error(
      "No merchant-claimable Umbra UTXO matched this payment submission.",
    );
  }

  return serializeClaimabilityEvidence(match, expected);
}
