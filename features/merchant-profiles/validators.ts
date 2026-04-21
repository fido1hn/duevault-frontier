import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  sanitizeRequired,
} from "@/features/invoices/validators";
import type {
  SaveUmbraRegistrationInput,
  SerializedUmbraAccountState,
  UmbraNetwork,
  UmbraRegistrationStatus,
} from "@/features/merchant-profiles/types";

export {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
};

export function sanitizeWalletAddress(value: string) {
  const normalized = sanitizeRequired(value, "Wallet address");

  if (normalized.length < 32) {
    throw new Error("Wallet address is too short.");
  }

  return normalized;
}

export function sanitizeContactEmail(value: string) {
  const normalized = sanitizeRequired(value, "Contact email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Contact email must be a valid email address.");
  }

  return normalized;
}

export function assertUmbraNetwork(value: string): asserts value is UmbraNetwork {
  if (value !== "devnet" && value !== "mainnet") {
    throw new Error("Invalid Umbra network.");
  }
}

export function assertUmbraRegistrationStatus(
  value: string,
): asserts value is UmbraRegistrationStatus {
  if (
    value !== "not_setup" &&
    value !== "registering" &&
    value !== "ready" &&
    value !== "error"
  ) {
    throw new Error("Invalid Umbra registration status.");
  }
}

export function sanitizeUmbraNetwork(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Umbra network is required.");
  }

  const normalized = value.trim();
  assertUmbraNetwork(normalized);

  return normalized;
}

export function sanitizeUmbraRegistrationSignatures(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Umbra registration signatures must be an array.");
  }

  return value.map((signature) => {
    if (typeof signature !== "string") {
      throw new Error("Umbra registration signatures must be strings.");
    }

    return sanitizeRequired(signature, "Umbra registration signature");
  });
}

function sanitizeUmbraAccountState(value: unknown): SerializedUmbraAccountState {
  if (!value || typeof value !== "object") {
    throw new Error("Umbra account state is required.");
  }

  const account = value as Record<string, unknown>;

  if (account.state === "non_existent") {
    return {
      state: "non_existent",
    };
  }

  if (account.state !== "exists") {
    throw new Error("Invalid Umbra account state.");
  }

  return {
    state: "exists",
    isInitialised: Boolean(account.isInitialised),
    isUserAccountX25519KeyRegistered: Boolean(
      account.isUserAccountX25519KeyRegistered,
    ),
    isUserCommitmentRegistered: Boolean(account.isUserCommitmentRegistered),
    isActiveForAnonymousUsage: Boolean(account.isActiveForAnonymousUsage),
  };
}

export function sanitizeSaveUmbraRegistrationInput(
  input: unknown,
): SaveUmbraRegistrationInput {
  if (!input || typeof input !== "object") {
    throw new Error("Umbra registration payload is required.");
  }

  const record = input as Record<string, unknown>;

  if (typeof record.walletAddress !== "string") {
    throw new Error("Wallet address is required.");
  }

  return {
    walletAddress: sanitizeWalletAddress(record.walletAddress),
    network: sanitizeUmbraNetwork(record.network),
    signatures: sanitizeUmbraRegistrationSignatures(record.signatures),
    account: sanitizeUmbraAccountState(record.account),
  };
}

export { sanitizeRequired };
