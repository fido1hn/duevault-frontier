import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  InvoiceMint,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

export type MerchantProfileRecord = Prisma.MerchantProfileGetPayload<object>;

export type UpsertMerchantProfileRecordInput = {
  walletAddress: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes: string;
  defaultMint: InvoiceMint;
  paymentRail: PaymentRail;
  privacyRail: PrivacyRail;
  onboardingCompletedAt: Date;
};

export async function findMerchantProfileByWallet(walletAddress: string) {
  return db.merchantProfile.findUnique({
    where: {
      walletAddress,
    },
  });
}

export async function upsertMerchantProfileRecord(
  input: UpsertMerchantProfileRecordInput,
) {
  return db.merchantProfile.upsert({
    where: {
      walletAddress: input.walletAddress,
    },
    update: {
      businessName: input.businessName,
      contactEmail: input.contactEmail,
      businessAddress: input.businessAddress,
      defaultNotes: input.defaultNotes,
      defaultMint: input.defaultMint,
      paymentRail: input.paymentRail,
      privacyRail: input.privacyRail,
      onboardingCompletedAt: input.onboardingCompletedAt,
    },
    create: input,
  });
}
