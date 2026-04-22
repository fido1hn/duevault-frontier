"use client";

import { createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import type { QueryUserAccountResult } from "@umbra-privacy/sdk/types";
import type { SolanaStandardWallet } from "@privy-io/react-auth/solana";
import type { Wallet, WalletAccount } from "@wallet-standard/base";

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
  walletAddress: string;
  standardWallets: SolanaStandardWallet[];
  onStep?: (step: MerchantUmbraRegistrationStepId) => void;
};

type MatchedStandardWallet = {
  wallet: SolanaStandardWallet;
  account: SolanaStandardWallet["accounts"][number];
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

function findStandardWalletAccount(
  wallets: SolanaStandardWallet[],
  walletAddress: string,
): MatchedStandardWallet | null {
  for (const wallet of wallets) {
    const account = wallet.accounts.find(
      (candidate) => candidate.address === walletAddress,
    );

    if (account) {
      return {
        wallet,
        account,
      };
    }
  }

  return null;
}

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
  walletAddress,
  standardWallets,
  onStep,
}: RunMerchantUmbraRegistrationInput): Promise<SaveUmbraRegistrationInput> {
  const matchedWallet = findStandardWalletAccount(standardWallets, walletAddress);

  if (!matchedWallet) {
    throw new Error("Connect the Solana wallet attached to this merchant profile.");
  }

  const runtimeConfig = getUmbraRuntimeConfig();
  const signer = createSignerFromWalletAccount(
    matchedWallet.wallet as Wallet,
    matchedWallet.account as WalletAccount,
  );
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
    throw new Error(describeUmbraFailure("Umbra registration", error));
  }

  onStep?.("verifying");
  let verifiedAccount: QueryUserAccountResult;

  try {
    verifiedAccount = await queryDueVaultUserRegistration(config, walletAddress);
  } catch (error) {
    throw new Error(describeUmbraFailure("Umbra post-registration check", error));
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
