import type { InvoiceMint, PaymentRail, PrivacyRail } from "@/lib/invoice-types";

export const DEFAULT_PROFILE_NOTES =
  "Thank you for your business. Payment is expected within 30 days.";

export type SerializedMerchantProfile = {
  id: string;
  walletAddress: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes: string;
  defaultMint: InvoiceMint;
  paymentRail: PaymentRail;
  privacyRail: PrivacyRail;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertMerchantProfileInput = {
  walletAddress: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes?: string;
  defaultMint?: InvoiceMint;
  paymentRail?: PaymentRail;
  privacyRail?: PrivacyRail;
};
