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
  isUmbraUserFullyRegistered,
  queryDueVaultUserRegistration,
  registerDueVaultUser,
} from "@/lib/umbra/sdk";
import type {
  SaveUmbraRegistrationInput,
  SerializedUmbraAccountState,
} from "@/features/merchant-profiles/types";
import { toUmbraUserFacingError } from "@/features/umbra/errors";

export type MerchantUmbraRegistrationStepId =
  | "checking"
  | "account"
  | "encryption"
  | "anonymous"
  | "verifying"
  | "saving"
  | "complete"
  | "error";

type RunMerchantUmbraRegistrationInput = {
  wallet: ConnectedStandardSolanaWallet;
  signTransaction: UseSignTransaction["signTransaction"];
  signMessage: UseSignMessage["signMessage"];
  onStep?: (step: MerchantUmbraRegistrationStepId) => void;
};

export function serializeUmbraAccountState(
  account: QueryUserAccountResult,
): SerializedUmbraAccountState {
  if (account.state === "non_existent") {
    return {
      state: "non_existent",
    };
  }

  return {
    state: "exists",
    isInitialised: account.data.isInitialised,
    isUserAccountX25519KeyRegistered:
      account.data.isUserAccountX25519KeyRegistered,
    isUserCommitmentRegistered: account.data.isUserCommitmentRegistered,
    isActiveForAnonymousUsage: account.data.isActiveForAnonymousUsage,
  };
}

export async function runMerchantUmbraRegistration({
  wallet,
  signTransaction,
  signMessage,
  onStep,
}: RunMerchantUmbraRegistrationInput): Promise<SaveUmbraRegistrationInput> {
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

  if (isUmbraUserFullyRegistered(currentAccount)) {
    return {
      walletAddress,
      network: runtimeConfig.network,
      signatures: [],
      account: serializeUmbraAccountState(currentAccount),
    };
  }

  onStep?.("account");
  let signatures: Awaited<ReturnType<typeof registerDueVaultUser>>;

  try {
    signatures = await registerDueVaultUser(config, {
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
            onStep?.("anonymous");
          },
        },
        registerUserForAnonymousUsage: {
          pre: async () => {
            onStep?.("anonymous");
          },
          post: async () => {
            onStep?.("verifying");
          },
        },
      },
    });
  } catch (error) {
    throw toUmbraUserFacingError("Umbra registration", error);
  }

  onStep?.("verifying");
  let verifiedAccount: QueryUserAccountResult;

  try {
    verifiedAccount = await queryDueVaultUserRegistration(config, walletAddress);
  } catch (error) {
    throw toUmbraUserFacingError("Umbra post-registration check", error);
  }

  if (!isUmbraUserFullyRegistered(verifiedAccount)) {
    throw new Error("Umbra registration did not reach a fully ready state.");
  }

  return {
    walletAddress,
    network: runtimeConfig.network,
    signatures: signatures.map((signature) => String(signature)),
    account: serializeUmbraAccountState(verifiedAccount),
  };
}
