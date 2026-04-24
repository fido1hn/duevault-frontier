"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
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
  mintDisplayName: string;
  mintDecimals: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
}

function getNestedCause(error: unknown) {
  if (!isRecord(error) || !("cause" in error)) {
    return null;
  }

  return error.cause;
}

function getUmbraErrorStage(
  error: unknown,
  visited = new Set<unknown>(),
): string | null {
  if (!isRecord(error) || visited.has(error)) {
    return null;
  }

  visited.add(error);
  const stage = error.stage;

  if (typeof stage === "string" && stage.length > 0) {
    return stage;
  }

  return getUmbraErrorStage(getNestedCause(error), visited);
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function collectSimulationLogs(
  error: unknown,
  visited = new Set<unknown>(),
): string[] {
  if (!isRecord(error) || visited.has(error)) {
    return [];
  }

  visited.add(error);

  return [
    ...readStringArray(error.simulationLogs),
    ...readStringArray(error.logs),
    ...collectSimulationLogs(getNestedCause(error), visited),
  ];
}

function collectCauseMessages(
  error: unknown,
  visited = new Set<unknown>(),
): string[] {
  if (!isRecord(error) || visited.has(error)) {
    return [];
  }

  visited.add(error);

  return [
    getErrorMessage(error),
    ...collectCauseMessages(getNestedCause(error), visited),
  ];
}

function describeUmbraFailure(action: string, error: unknown) {
  const message = getErrorMessage(error);
  const stage = getUmbraErrorStage(error);
  const causeDetails = collectCauseMessages(getNestedCause(error)).filter(
    (detail) => detail !== message,
  );
  const simulationLogs = collectSimulationLogs(error);
  const detailSuffix =
    causeDetails.length > 0
      ? ` Details: ${causeDetails.slice(0, 2).join(" | ")}`
      : "";
  const simulationSuffix =
    simulationLogs.length > 0
      ? ` Simulation logs: ${simulationLogs.slice(-8).join(" | ")}`
      : "";

  if (message === "Failed to fetch" || message === "fetch failed") {
    return `${action} failed because an Umbra network request could not be reached. Retry in a moment; if it persists, check the configured RPC and Umbra ZK asset proxy.`;
  }

  return `${action} failed${
    stage ? ` during ${stage}` : ""
  }: ${message}${detailSuffix}${simulationSuffix}`;
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
  onStep?.("customer_account");

  try {
    const currentAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (isUmbraUserFullyRegistered(currentAccount)) {
      onStep?.("customer_verifying");
      return;
    }
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer Umbra setup check", error));
  }

  try {
    await registerDueVaultUser(config, {
      callbacks: {
        userAccountInitialisation: {
          pre: async () => {
            onStep?.("customer_account");
          },
          post: async () => {
            onStep?.("customer_encryption");
          },
        },
        registerX25519PublicKey: {
          pre: async () => {
            onStep?.("customer_encryption");
          },
          post: async () => {
            onStep?.("customer_anonymous");
          },
        },
        registerUserForAnonymousUsage: {
          pre: async () => {
            onStep?.("customer_anonymous");
          },
          post: async () => {
            onStep?.("customer_verifying");
          },
        },
      },
    });
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer Umbra setup", error));
  }

  onStep?.("customer_verifying");

  try {
    const verifiedAccount = await queryDueVaultUserRegistration(
      config,
      walletAddress,
    );

    if (!isUmbraUserFullyRegistered(verifiedAccount)) {
      throw new Error("Customer Umbra setup did not reach a ready state.");
    }
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Customer Umbra setup verification", error),
    );
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
  mintDecimals,
  mintDisplayName,
  optionalData,
  onStep,
  signMessage,
  signTransaction,
  wallet,
}: RunCustomerUmbraPaymentInput): Promise<CustomerUmbraPaymentResult> {
  onStep?.("wallet");
  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createPrivyUmbraSigner({
    network: runtimeConfig.network,
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
    throw new Error(
      describeUmbraFailure("Merchant Umbra readiness check", error),
    );
  }

  onStep?.("preflight");

  try {
    await assertCustomerPaymentReadiness({
      amountAtomic,
      config,
      mintAddress,
      mintDecimals,
      mintDisplayName,
      payerWalletAddress: wallet.address,
      rpcUrl: runtimeConfig.rpcUrl,
    });
  } catch (error) {
    throw new Error(describeUmbraFailure("Customer balance check", error));
  }

  await ensureCustomerUmbraRegistration({
    config,
    onStep,
    walletAddress: wallet.address,
  });

  onStep?.("payment_preflight");

  try {
    await assertCustomerPaymentReadiness({
      amountAtomic,
      config,
      mintAddress,
      mintDecimals,
      mintDisplayName,
      payerWalletAddress: wallet.address,
      rpcUrl: runtimeConfig.rpcUrl,
    });
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Customer payment balance check", error),
    );
  }

  onStep?.("master_seed");
  const invoiceReference = optionalDataFromHex(optionalData);

  try {
    onStep?.("proof_generation");
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
    const simulationLogs = collectSimulationLogs(error);
    console.error("[Umbra customer payment] failed", {
      error,
      simulationLogs,
    });
    throw new Error(describeUmbraFailure("Umbra private payment", error));
  }
}
