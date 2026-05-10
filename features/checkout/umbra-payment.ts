"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import {
  normalizeUmbraError,
  toUmbraUserFacingError,
} from "@/features/umbra/errors";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  createPrivatePayment,
  type DueVaultConfig,
  isUmbraUserFullyRegistered,
  queryDueVaultUserRegistration,
  registerDueVaultUser,
} from "@/lib/umbra/sdk";

export type CustomerUmbraPaymentStepId =
  | "wallet"
  | "checking"
  | "customer_registration"
  | "preparing_payment"
  | "create_utxo"
  | "saving"
  | "complete"
  | "error";

export type CustomerUmbraPaymentResult = {
  payerWalletAddress: string;
  network: string;
  mint: string;
  amountAtomic: string;
  merchantUmbraWalletAddress: string;
  optionalData: string;
  closeProofAccountSignature?: string;
  createProofAccountSignature: string;
  createUtxoSignature: string;
};

type RunCustomerUmbraPaymentInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  merchantUmbraWalletAddress: string;
  mintAddress: string;
  amountAtomic: string;
  optionalData: string;
  onStep?: (step: CustomerUmbraPaymentStepId) => void;
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

async function ensureCustomerUmbraRegistration({
  config,
  onStep,
  walletAddress,
}: {
  config: Parameters<typeof queryDueVaultUserRegistration>[0];
  onStep?: (step: CustomerUmbraPaymentStepId) => void;
  walletAddress: string;
}) {
  onStep?.("customer_registration");

  try {
    const currentAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (isUmbraUserFullyRegistered(currentAccount)) {
      return;
    }
  } catch (error) {
    throw toUmbraUserFacingError("Customer Umbra setup check", error);
  }

  try {
    await registerDueVaultUser(config);
  } catch (error) {
    throw toUmbraUserFacingError("Customer Umbra setup", error);
  }

  try {
    const verifiedAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (!isUmbraUserFullyRegistered(verifiedAccount)) {
      throw new Error("Customer Umbra setup did not reach a ready state.");
    }
  } catch (error) {
    throw toUmbraUserFacingError("Customer Umbra setup verification", error);
  }
}

function optionalDataFromHex(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error("Umbra invoice reference must be a 32-byte hex string.");
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export async function runCustomerUmbraPayment({
  amountAtomic,
  merchantUmbraWalletAddress,
  mintAddress,
  optionalData,
  onStep,
  signMessage,
  signTransaction,
  wallet,
}: RunCustomerUmbraPaymentInput): Promise<CustomerUmbraPaymentResult> {
  onStep?.("wallet");
  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createPrivyUmbraSigner({
    signMessage,
    signTransaction,
    wallet,
  });
  const config = {
    ...runtimeConfig,
    signer,
    masterSeedStorage: createClickScopedMasterSeedStorage(),
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
  };

  onStep?.("checking");

  try {
    const merchantAccount = await queryDueVaultUserRegistration(
      config,
      merchantUmbraWalletAddress,
    );

    if (!isUmbraUserFullyRegistered(merchantAccount)) {
      throw new Error("Merchant Umbra account is not fully registered.");
    }
  } catch (error) {
    throw toUmbraUserFacingError("Merchant Umbra readiness check", error);
  }

  await ensureCustomerUmbraRegistration({
    config,
    onStep,
    walletAddress: wallet.address,
  });

  onStep?.("preparing_payment");
  const invoiceReference = optionalDataFromHex(optionalData);

  try {
    const signatures = await createPrivatePayment(config, {
      destinationAddress: merchantUmbraWalletAddress,
      mint: mintAddress,
      amount: BigInt(amountAtomic),
      optionalData: invoiceReference,
      callbacks: {
        createUtxo: {
          pre: async () => {
            onStep?.("create_utxo");
          },
          post: async () => {
            onStep?.("saving");
          },
        },
      },
    });

    return {
      payerWalletAddress: wallet.address,
      network: runtimeConfig.network,
      mint: mintAddress,
      amountAtomic,
      merchantUmbraWalletAddress,
      optionalData,
      closeProofAccountSignature: signatures.closeProofAccountSignature
        ? String(signatures.closeProofAccountSignature)
        : undefined,
      createProofAccountSignature: String(
        signatures.createProofAccountSignature,
      ),
      createUtxoSignature: String(signatures.createUtxoSignature),
    };
  } catch (error) {
    const normalized = normalizeUmbraError("Umbra private payment", error);
    console.error("[Umbra customer payment] failed", {
      category: normalized.category,
      debugMessage: normalized.debugMessage,
    });
    throw toUmbraUserFacingError("Umbra private payment", error);
  }
}
