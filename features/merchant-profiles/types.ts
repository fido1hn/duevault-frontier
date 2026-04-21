import type {
  InvoiceMint,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

export type UmbraNetwork = "devnet" | "mainnet";
export type UmbraRegistrationStatus =
  | "not_setup"
  | "registering"
  | "ready"
  | "error";

export type SerializedUmbraAccountState =
  | {
      state: "non_existent";
    }
  | {
      state: "exists";
      isInitialised: boolean;
      isUserAccountX25519KeyRegistered: boolean;
      isUserCommitmentRegistered: boolean;
      isActiveForAnonymousUsage: boolean;
    };

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
  umbraNetwork: UmbraNetwork;
  umbraStatus: UmbraRegistrationStatus;
  umbraRegisteredAt: string | null;
  umbraWalletAddress: string | null;
  umbraRegistrationSignatures: string[];
  umbraLastCheckedAt: string | null;
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

export type SaveUmbraRegistrationInput = {
  walletAddress: string;
  network: UmbraNetwork;
  signatures: string[];
  account: SerializedUmbraAccountState;
};
