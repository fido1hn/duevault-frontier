import type { MerchantProfileRecord } from "@/features/merchant-profiles/repository";
import type { SerializedMerchantProfile } from "@/features/merchant-profiles/types";
import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  assertUmbraNetwork,
  assertUmbraRegistrationStatus,
} from "@/features/merchant-profiles/validators";

export function serializeMerchantProfile(
  profile: MerchantProfileRecord,
): SerializedMerchantProfile {
  assertInvoiceMint(profile.defaultMint);
  assertPaymentRail(profile.paymentRail);
  assertPrivacyRail(profile.privacyRail);
  assertUmbraNetwork(profile.umbraNetwork);
  assertUmbraRegistrationStatus(profile.umbraStatus);

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
    umbraNetwork: profile.umbraNetwork,
    umbraStatus: profile.umbraStatus,
    umbraRegisteredAt: profile.umbraRegisteredAt?.toISOString() ?? null,
    umbraWalletAddress: profile.umbraWalletAddress,
    umbraRegistrationSignatures: profile.umbraRegistrationSignatures,
    umbraLastCheckedAt: profile.umbraLastCheckedAt?.toISOString() ?? null,
    onboardingCompletedAt:
      profile.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
