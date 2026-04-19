import type {
  InvoiceMint,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

export type SerializedMerchantProfile = {
  id: string;
  userId: string;
  primaryWalletId: string;
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
  primaryWalletAddress?: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes?: string;
  defaultMint?: InvoiceMint;
  paymentRail?: PaymentRail;
  privacyRail?: PrivacyRail;
};
