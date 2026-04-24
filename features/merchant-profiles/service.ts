import "server-only";

import { DEFAULT_PROFILE_NOTES } from "@/features/merchant-profiles/constants";
import {
  getUmbraCheckoutMint,
  getUmbraRuntimeNetwork,
} from "@/lib/umbra/config";
import { serializeMerchantProfile } from "@/features/merchant-profiles/mappers";
import {
  findMerchantProfileByUserId,
  updateMerchantUmbraRegistrationRecord,
  upsertMerchantProfileRecord,
} from "@/features/merchant-profiles/repository";
import type {
  SaveUmbraRegistrationInput,
  UpsertMerchantProfileInput,
} from "@/features/merchant-profiles/types";
import type { AuthContext } from "@/server/auth";
import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  sanitizeContactEmail,
  sanitizeRequired,
  sanitizeSaveUmbraRegistrationInput,
  sanitizeWalletAddress,
} from "@/features/merchant-profiles/validators";

export async function getMerchantProfileForUser(userId: string) {
  const profile = await findMerchantProfileByUserId(userId);

  return profile ? serializeMerchantProfile(profile) : null;
}

export async function upsertMerchantProfile(
  authContext: AuthContext,
  input: UpsertMerchantProfileInput,
) {
  const primaryWalletAddress = input.primaryWalletAddress
    ? sanitizeWalletAddress(input.primaryWalletAddress)
    : null;
  const primaryWallet = primaryWalletAddress
    ? authContext.wallets.find(
        (wallet) =>
          wallet.chain === "solana" && wallet.address === primaryWalletAddress,
      )
    : authContext.wallets.find((wallet) => wallet.chain === "solana");

  if (!primaryWallet) {
    throw new Error("Connect a Solana wallet before creating a merchant profile.");
  }

  const businessName = sanitizeRequired(input.businessName, "Business name");
  const contactEmail = sanitizeContactEmail(input.contactEmail);
  const businessAddress = sanitizeRequired(
    input.businessAddress,
    "Business address",
  );
  const defaultMint = input.defaultMint ?? getUmbraCheckoutMint().id;
  const paymentRail = input.paymentRail ?? "solana";
  const privacyRail = input.privacyRail ?? "umbra";

  assertInvoiceMint(defaultMint);
  assertPaymentRail(paymentRail);
  assertPrivacyRail(privacyRail);

  const profile = await upsertMerchantProfileRecord({
    userId: authContext.user.id,
    primaryWalletId: primaryWallet.id,
    businessName,
    contactEmail,
    businessAddress,
    defaultNotes: input.defaultNotes?.trim() || DEFAULT_PROFILE_NOTES,
    defaultMint,
    paymentRail,
    privacyRail,
    umbraNetwork: getUmbraRuntimeNetwork(),
    onboardingCompletedAt: new Date(),
  });

  return serializeMerchantProfile(profile);
}

function assertReadyUmbraAccount(input: SaveUmbraRegistrationInput) {
  if (
    input.account.state !== "exists" ||
    !input.account.isInitialised ||
    !input.account.isUserAccountX25519KeyRegistered ||
    !input.account.isUserCommitmentRegistered ||
    !input.account.isActiveForAnonymousUsage
  ) {
    throw new Error("Umbra registration is not fully ready.");
  }
}

export async function saveMerchantUmbraRegistration(
  authContext: AuthContext,
  input: SaveUmbraRegistrationInput,
) {
  const merchantProfile = authContext.merchantProfile;

  if (!merchantProfile) {
    throw new Error("Merchant profile setup is required.");
  }

  const sanitized = sanitizeSaveUmbraRegistrationInput(input);

  if (sanitized.walletAddress !== merchantProfile.primaryWallet.address) {
    throw new Error("Umbra wallet must match the merchant profile wallet.");
  }

  assertReadyUmbraAccount(sanitized);

  const now = new Date();
  const profile = await updateMerchantUmbraRegistrationRecord(
    merchantProfile.id,
    {
      network: sanitized.network,
      status: "ready",
      walletAddress: sanitized.walletAddress,
      signatures: sanitized.signatures,
      registeredAt: merchantProfile.umbraRegisteredAt ?? now,
      lastCheckedAt: now,
    },
  );

  return serializeMerchantProfile(profile);
}
