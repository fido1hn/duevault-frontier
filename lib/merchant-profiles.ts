import { db } from "@/lib/db";
import {
  INVOICE_MINTS,
  PAYMENT_RAILS,
  PRIVACY_RAILS,
  type InvoiceMint,
  type PaymentRail,
  type PrivacyRail,
} from "@/lib/invoice-types";
import {
  DEFAULT_PROFILE_NOTES,
  type SerializedMerchantProfile,
  type UpsertMerchantProfileInput,
} from "@/lib/merchant-profile-types";

type MerchantProfileRecord = {
  id: string;
  walletAddress: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes: string;
  defaultMint: string;
  paymentRail: string;
  privacyRail: string;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function assertInvoiceMint(value: string): asserts value is InvoiceMint {
  if (!INVOICE_MINTS.includes(value as InvoiceMint)) {
    throw new Error("Invalid default mint.");
  }
}

function assertPaymentRail(value: string): asserts value is PaymentRail {
  if (!PAYMENT_RAILS.includes(value as PaymentRail)) {
    throw new Error("Invalid payment rail.");
  }
}

function assertPrivacyRail(value: string): asserts value is PrivacyRail {
  if (!PRIVACY_RAILS.includes(value as PrivacyRail)) {
    throw new Error("Invalid privacy rail.");
  }
}

function sanitizeRequired(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function sanitizeWalletAddress(value: string) {
  const normalized = sanitizeRequired(value, "Wallet address");

  if (normalized.length < 32) {
    throw new Error("Wallet address is too short.");
  }

  return normalized;
}

function sanitizeEmail(value: string) {
  const normalized = sanitizeRequired(value, "Contact email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Contact email must be a valid email address.");
  }

  return normalized;
}

function serializeMerchantProfile(
  profile: MerchantProfileRecord,
): SerializedMerchantProfile {
  assertInvoiceMint(profile.defaultMint);
  assertPaymentRail(profile.paymentRail);
  assertPrivacyRail(profile.privacyRail);

  return {
    id: profile.id,
    walletAddress: profile.walletAddress,
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

export async function getMerchantProfileByWallet(walletAddress: string) {
  const profile = await db.merchantProfile.findUnique({
    where: {
      walletAddress: sanitizeWalletAddress(walletAddress),
    },
  });

  return profile ? serializeMerchantProfile(profile) : null;
}

export async function upsertMerchantProfile(input: UpsertMerchantProfileInput) {
  const walletAddress = sanitizeWalletAddress(input.walletAddress);
  const businessName = sanitizeRequired(input.businessName, "Business name");
  const contactEmail = sanitizeEmail(input.contactEmail);
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

  const profile = await db.merchantProfile.upsert({
    where: {
      walletAddress,
    },
    update: {
      businessName,
      contactEmail,
      businessAddress,
      defaultNotes: input.defaultNotes?.trim() || DEFAULT_PROFILE_NOTES,
      defaultMint,
      paymentRail,
      privacyRail,
      onboardingCompletedAt: new Date(),
    },
    create: {
      walletAddress,
      businessName,
      contactEmail,
      businessAddress,
      defaultNotes: input.defaultNotes?.trim() || DEFAULT_PROFILE_NOTES,
      defaultMint,
      paymentRail,
      privacyRail,
      onboardingCompletedAt: new Date(),
    },
  });

  return serializeMerchantProfile(profile);
}
