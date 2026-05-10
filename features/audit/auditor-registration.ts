"use client";

import type {
  ConnectedStandardSolanaWallet,
  UseSignMessage,
  UseSignTransaction,
} from "@privy-io/react-auth/solana";
import type { QueryUserAccountResult } from "@umbra-privacy/sdk/types";

import { createPrivyUmbraSigner } from "@/features/checkout/privy-umbra-signer";
import { toUmbraUserFacingError } from "@/features/umbra/errors";
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
    throw toUmbraUserFacingError("Umbra account check", error);
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
    throw toUmbraUserFacingError("Auditor x25519 registration", error);
  }

  onStep?.("verifying");
  let verifiedAccount: QueryUserAccountResult;

  try {
    verifiedAccount = await queryDueVaultUserRegistration(config, walletAddress);
  } catch (error) {
    throw toUmbraUserFacingError("Auditor post-registration check", error);
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
