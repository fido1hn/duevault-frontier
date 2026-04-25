"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import type { ResolvedPaymentMintConfig } from "@/features/payments/mints";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import type { DueVaultConfig } from "@/lib/umbra/sdk";
import { queryPrivateBalance, withdrawPrivateBalance } from "@/lib/umbra/sdk";

type MerchantWalletActionInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  mint: ResolvedPaymentMintConfig;
  masterSeedStorage: NonNullable<DueVaultConfig["masterSeedStorage"]>;
};

type MerchantWalletWithdrawInput = MerchantWalletActionInput & {
  atomicAmount: bigint;
};

export function createMerchantWalletMasterSeedStorage(): NonNullable<
  DueVaultConfig["masterSeedStorage"]
> {
  let cachedMasterSeed: MasterSeed | null = null;

  return {
    async load() {
      if (!cachedMasterSeed) {
        return { exists: false };
      }

      return {
        exists: true,
        seed: cachedMasterSeed,
      };
    },
    async store(seed) {
      cachedMasterSeed = seed;

      return {
        success: true,
      };
    },
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getUmbraErrorStage(error: unknown) {
  if (!error || typeof error !== "object" || !("stage" in error)) {
    return null;
  }

  const stage = (error as { stage?: unknown }).stage;

  return typeof stage === "string" && stage.length > 0 ? stage : null;
}

function describeMerchantWalletFailure(action: string, error: unknown) {
  const message = getErrorMessage(error);
  const stage = getUmbraErrorStage(error);

  if (message === "Failed to fetch" || message === "fetch failed") {
    return `${action} failed because an Umbra network request could not be reached. Check the configured RPC and indexer, then retry.`;
  }

  return `${action} failed${stage ? ` during ${stage}` : ""}: ${message}`;
}

function createMerchantWalletConfig({
  masterSeedStorage,
  mint,
  signMessage,
  signTransaction,
  wallet,
}: MerchantWalletActionInput): DueVaultConfig {
  const runtimeConfig = getUmbraRuntimeConfig();

  if (mint.network !== runtimeConfig.network) {
    throw new Error(
      `Wallet mint ${mint.symbol} is configured for ${mint.network}, but Umbra is running on ${runtimeConfig.network}.`,
    );
  }

  return {
    ...runtimeConfig,
    signer: createPrivyUmbraSigner({
      wallet,
      signTransaction,
      signMessage,
      network: runtimeConfig.network,
    }),
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
    masterSeedStorage,
  };
}

export async function loadMerchantPrivateBalance(input: MerchantWalletActionInput) {
  const config = createMerchantWalletConfig(input);

  try {
    return await queryPrivateBalance(config, input.mint.address);
  } catch (error) {
    throw new Error(describeMerchantWalletFailure("Balance refresh", error));
  }
}

export async function withdrawMerchantPrivateBalance(
  input: MerchantWalletWithdrawInput,
) {
  const config = createMerchantWalletConfig(input);

  try {
    return await withdrawPrivateBalance(
      config,
      input.mint.address,
      input.atomicAmount,
    );
  } catch (error) {
    throw new Error(describeMerchantWalletFailure("Withdrawal", error));
  }
}
