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
