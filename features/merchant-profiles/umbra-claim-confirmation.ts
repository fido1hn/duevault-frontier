"use client";

import { getClaimableUtxoScannerFunction } from "@umbra-privacy/sdk";
import type { ScannedUtxoData } from "@umbra-privacy/sdk/interfaces";
import type { MasterSeed, U32 } from "@umbra-privacy/sdk/types";
import { splitAddressToLowHigh } from "@umbra-privacy/sdk/utils";
import { address } from "@solana/kit";
import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
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
  };
};

function createClickScopedMasterSeedStorage(): NonNullable<
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
) {
  return (
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
}: FindMerchantClaimableUmbraPaymentInput) {
  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createPrivyUmbraSigner({
    wallet,
    signTransaction,
    signMessage,
    network: runtimeConfig.network,
  });
  const client = await createDueVaultClient({
    ...runtimeConfig,
    signer,
    masterSeedStorage: createClickScopedMasterSeedStorage(),
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
  });
  const scanClaimableUtxos = getClaimableUtxoScannerFunction({ client });
  const scanned = await scanClaimableUtxos(0n as U32, 0n as U32);
  const match = [...scanned.received, ...scanned.publicReceived].find((utxo) =>
    utxoMatchesExpected(utxo, expected),
  );

  if (!match) {
    throw new Error(
      "No merchant-claimable Umbra UTXO matched this payment submission.",
    );
  }

  return serializeClaimabilityEvidence(match, expected);
}
