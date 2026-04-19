import "server-only";

import { DEFAULT_PROFILE_NOTES } from "@/features/merchant-profiles/constants";
import { serializeMerchantProfile } from "@/features/merchant-profiles/mappers";
import {
  findMerchantProfileByUserId,
  upsertMerchantProfileRecord,
} from "@/features/merchant-profiles/repository";
import type { UpsertMerchantProfileInput } from "@/features/merchant-profiles/types";
import type { AuthContext } from "@/server/auth";
import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  sanitizeContactEmail,
  sanitizeRequired,
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
  const defaultMint = input.defaultMint ?? "USDC";
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
    onboardingCompletedAt: new Date(),
  });

  return serializeMerchantProfile(profile);
}
