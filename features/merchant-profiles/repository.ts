import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  InvoiceMint,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

const merchantProfileInclude = {
  primaryWallet: true,
} satisfies Prisma.MerchantProfileInclude;

export type MerchantProfileRecord = Prisma.MerchantProfileGetPayload<{
  include: typeof merchantProfileInclude;
}>;

export type UpsertMerchantProfileRecordInput = {
  userId: string;
  primaryWalletId: string;
  businessName: string;
  contactEmail: string;
  businessAddress: string;
  defaultNotes: string;
  defaultMint: InvoiceMint;
  paymentRail: PaymentRail;
  privacyRail: PrivacyRail;
  onboardingCompletedAt: Date;
};

export async function findMerchantProfileByUserId(userId: string) {
  return db.merchantProfile.findUnique({
    where: {
      userId,
    },
    include: merchantProfileInclude,
  });
}

export async function upsertMerchantProfileRecord(
  input: UpsertMerchantProfileRecordInput,
) {
  return db.merchantProfile.upsert({
    where: {
      userId: input.userId,
    },
    update: {
      primaryWalletId: input.primaryWalletId,
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
    include: merchantProfileInclude,
  });
}
