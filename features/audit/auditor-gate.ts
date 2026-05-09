import { formatSolLamports } from "@/features/umbra/costs";

export type AuditorRegistrationStatus =
  | "unknown"
  | "registered"
  | "unregistered";

export type AuditorGateState =
  | { kind: "loading"; canShowDecryptForm: false }
  | { kind: "sign_in"; canShowDecryptForm: false }
  | { kind: "connect_wallet"; canShowDecryptForm: false }
  | {
      kind: "wallet_mismatch";
      canShowDecryptForm: false;
      expectedAddress: string;
      connectedAddress: string;
    }
  | {
      kind: "connect_active_wallet";
      canShowDecryptForm: false;
      walletAddress: string;
    }
  | { kind: "checking"; canShowDecryptForm: false; walletAddress: string }
  | { kind: "register"; canShowDecryptForm: false; walletAddress: string }
  | { kind: "ready"; canShowDecryptForm: true; walletAddress: string };

export type AuditorRegistrationFundingState =
  | { kind: "checking"; canRegister: false; message: string }
  | { kind: "unavailable"; canRegister: true; message: string }
  | { kind: "ready"; canRegister: true; message: string }
  | { kind: "underfunded"; canRegister: false; message: string };

export function getAuditorGateState({
  activeWalletAddress,
  authenticated,
  linkedWalletAddress,
  privyReady,
  registrationStatus,
  tokenAuditorAddress,
  walletsReady,
}: {
  activeWalletAddress: string | null;
  authenticated: boolean;
  linkedWalletAddress: string | null;
  privyReady: boolean;
  registrationStatus: AuditorRegistrationStatus;
  tokenAuditorAddress: string | null;
  walletsReady: boolean;
}): AuditorGateState {
  if (!privyReady) {
    return { kind: "loading", canShowDecryptForm: false };
  }

  if (!authenticated) {
    return { kind: "sign_in", canShowDecryptForm: false };
  }

  if (!linkedWalletAddress) {
    return { kind: "connect_wallet", canShowDecryptForm: false };
  }

  if (tokenAuditorAddress && linkedWalletAddress !== tokenAuditorAddress) {
    return {
      kind: "wallet_mismatch",
      canShowDecryptForm: false,
      expectedAddress: tokenAuditorAddress,
      connectedAddress: linkedWalletAddress,
    };
  }

  if (!walletsReady) {
    return {
      kind: "checking",
      canShowDecryptForm: false,
      walletAddress: linkedWalletAddress,
    };
  }

  if (!activeWalletAddress) {
    return {
      kind: "connect_active_wallet",
      canShowDecryptForm: false,
      walletAddress: linkedWalletAddress,
    };
  }

  if (registrationStatus === "unknown") {
    return {
      kind: "checking",
      canShowDecryptForm: false,
      walletAddress: linkedWalletAddress,
    };
  }

  if (registrationStatus === "unregistered") {
    return {
      kind: "register",
      canShowDecryptForm: false,
      walletAddress: linkedWalletAddress,
    };
  }

  return {
    kind: "ready",
    canShowDecryptForm: true,
    walletAddress: linkedWalletAddress,
  };
}

export function getAuditorRegistrationFundingState({
  balanceError,
  isLoading,
  requiredSolLamports,
  solBalanceLamports,
}: {
  balanceError: string | null;
  isLoading: boolean;
  requiredSolLamports: bigint;
  solBalanceLamports: bigint | null;
}): AuditorRegistrationFundingState {
  if (isLoading) {
    return {
      kind: "checking",
      canRegister: false,
      message: "Checking SOL balance for Umbra setup fees.",
    };
  }

  if (balanceError) {
    return {
      kind: "unavailable",
      canRegister: true,
      message:
        "Balance check unavailable. You can still try registration from your wallet.",
    };
  }

  if (solBalanceLamports === null) {
    return {
      kind: "checking",
      canRegister: false,
      message: "Checking SOL balance for Umbra setup fees.",
    };
  }

  if (solBalanceLamports !== null && solBalanceLamports < requiredSolLamports) {
    return {
      kind: "underfunded",
      canRegister: false,
      message: `Add at least ${formatSolLamports(requiredSolLamports)} to register your Umbra x25519 key.`,
    };
  }

  return {
    kind: "ready",
    canRegister: true,
    message: "Your wallet has enough SOL for the estimated Umbra setup fees.",
  };
}

export function getEffectiveAuditorRegistrationStatus({
  checkedWalletAddress,
  isChecking,
  registrationStatus,
  targetWalletAddress,
}: {
  checkedWalletAddress: string | null;
  isChecking: boolean;
  registrationStatus: AuditorRegistrationStatus;
  targetWalletAddress: string | null;
}): AuditorRegistrationStatus {
  if (!targetWalletAddress || checkedWalletAddress !== targetWalletAddress) {
    return "unknown";
  }

  if (isChecking && registrationStatus !== "unknown") {
    return registrationStatus;
  }

  return registrationStatus;
}
