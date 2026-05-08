"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { QueryUserAccountResult } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { getUmbraRuntimeConfig } from "@/lib/umbra/config";
import {
  isAuditorX25519Registered,
  queryDueVaultUserRegistration,
  registerAuditorX25519,
} from "@/lib/umbra/sdk";

export type AuditorUmbraRegistrationStepId =
  | "checking"
  | "account"
  | "encryption"
  | "verifying"
  | "complete"
  | "error";

export type AuditorUmbraRegistrationResult = {
  walletAddress: string;
  network: ReturnType<typeof getUmbraRuntimeConfig>["network"];
  signatures: string[];
  alreadyRegistered: boolean;
};

type RunAuditorUmbraRegistrationInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  onStep?: (step: AuditorUmbraRegistrationStepId) => void;
};

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

function describeUmbraFailure(action: string, error: unknown) {
  const message = getErrorMessage(error);
  const stage = getUmbraErrorStage(error);

  if (message === "Failed to fetch" || message === "fetch failed") {
    return `${action} failed because an Umbra network request could not be reached. Restart the dev server and retry; if it persists, check the configured RPC and Umbra ZK asset proxy.`;
  }

  return `${action} failed${stage ? ` during ${stage}` : ""}: ${message}`;
}

export async function runAuditorUmbraRegistration({
  wallet,
  signTransaction,
  signMessage,
  onStep,
}: RunAuditorUmbraRegistrationInput): Promise<AuditorUmbraRegistrationResult> {
  const walletAddress = wallet.address;
  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createPrivyUmbraSigner({
    wallet,
    signTransaction,
    signMessage,
    network: runtimeConfig.network,
  });
  const config = {
    ...runtimeConfig,
    signer,
    deferMasterSeedSignature: true,
    preferPollingTransactionForwarder: true,
  };

  onStep?.("checking");
  let currentAccount: QueryUserAccountResult;

  try {
    currentAccount = await queryDueVaultUserRegistration(config, walletAddress);
  } catch (error) {
    throw new Error(describeUmbraFailure("Umbra account check", error));
  }

  if (isAuditorX25519Registered(currentAccount)) {
    onStep?.("complete");
    return {
      walletAddress,
      network: runtimeConfig.network,
      signatures: [],
      alreadyRegistered: true,
    };
  }

  let signatures: Awaited<ReturnType<typeof registerAuditorX25519>>;

  try {
    signatures = await registerAuditorX25519(config, {
      callbacks: {
        userAccountInitialisation: {
          pre: async () => {
            onStep?.("account");
          },
          post: async () => {
            onStep?.("encryption");
          },
        },
        registerX25519PublicKey: {
          pre: async () => {
            onStep?.("encryption");
          },
          post: async () => {
            onStep?.("verifying");
          },
        },
      },
    });
  } catch (error) {
    throw new Error(describeUmbraFailure("Auditor x25519 registration", error));
  }

  onStep?.("verifying");
  let verifiedAccount: QueryUserAccountResult;

  try {
    verifiedAccount = await queryDueVaultUserRegistration(config, walletAddress);
  } catch (error) {
    throw new Error(
      describeUmbraFailure("Auditor post-registration check", error),
    );
  }

  if (!isAuditorX25519Registered(verifiedAccount)) {
    throw new Error(
      "Auditor registration completed but the on-chain x25519 key did not appear. Try again.",
    );
  }

  onStep?.("complete");

  return {
    walletAddress,
    network: runtimeConfig.network,
    signatures: signatures.map((signature) => String(signature)),
    alreadyRegistered: false,
  };
}
