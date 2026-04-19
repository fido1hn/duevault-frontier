import "server-only";

import { DEFAULT_PROFILE_NOTES } from "@/features/merchant-profiles/constants";
import { serializeMerchantProfile } from "@/features/merchant-profiles/mappers";
import {
  findMerchantProfileByWallet,
  upsertMerchantProfileRecord,
} from "@/features/merchant-profiles/repository";
import type { UpsertMerchantProfileInput } from "@/features/merchant-profiles/types";
import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  sanitizeContactEmail,
  sanitizeRequired,
  sanitizeWalletAddress,
} from "@/features/merchant-profiles/validators";

export async function getMerchantProfileByWallet(walletAddress: string) {
  const profile = await findMerchantProfileByWallet(
    sanitizeWalletAddress(walletAddress),
  );

  return profile ? serializeMerchantProfile(profile) : null;
}

export async function upsertMerchantProfile(input: UpsertMerchantProfileInput) {
  const walletAddress = sanitizeWalletAddress(input.walletAddress);
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
    walletAddress,
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
