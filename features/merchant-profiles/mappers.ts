import type { MerchantProfileRecord } from "@/features/merchant-profiles/repository";
import type { SerializedMerchantProfile } from "@/features/merchant-profiles/types";
import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
} from "@/features/merchant-profiles/validators";

export function serializeMerchantProfile(
  profile: MerchantProfileRecord,
): SerializedMerchantProfile {
  assertInvoiceMint(profile.defaultMint);
  assertPaymentRail(profile.paymentRail);
  assertPrivacyRail(profile.privacyRail);

  return {
    id: profile.id,
    userId: profile.userId,
    primaryWalletId: profile.primaryWalletId,
    walletAddress: profile.primaryWallet.address,
    businessName: profile.businessName,
    contactEmail: profile.contactEmail,
    businessAddress: profile.businessAddress,
    defaultNotes: profile.defaultNotes,
    defaultMint: profile.defaultMint,
    paymentRail: profile.paymentRail,
    privacyRail: profile.privacyRail,
    onboardingCompletedAt:
      profile.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
