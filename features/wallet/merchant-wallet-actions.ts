"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import type { PaymentMintConfig } from "@/features/payments/mints";
import { toUmbraUserFacingError } from "@/features/umbra/errors";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import type { DueVaultConfig } from "@/lib/umbra/sdk";
import { queryPrivateBalance, withdrawPrivateBalance } from "@/lib/umbra/sdk";

type MerchantWalletActionInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  mint: PaymentMintConfig;
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

function createMerchantWalletConfig({
  masterSeedStorage,
  mint,
  signMessage,
  signTransaction,
  wallet,
}: MerchantWalletActionInput): DueVaultConfig {
  const runtimeConfig = getUmbraRuntimeConfig();

  return {
    ...runtimeConfig,
    signer: createPrivyUmbraSigner({
      wallet,
      signTransaction,
      signMessage,
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
    throw toUmbraUserFacingError("Balance refresh", error);
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
    throw toUmbraUserFacingError("Withdrawal", error);
  }
}
