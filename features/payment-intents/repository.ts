import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  SupportedMint,
  UpdatePaymentIntentRecordInput,
} from "@/features/payment-intents/types";

const paymentIntentInclude = {
  merchantProfile: {
    include: {
      primaryWallet: true,
    },
  },
} satisfies Prisma.PaymentIntentInclude;

export type PaymentIntentRecord = Prisma.PaymentIntentGetPayload<{
  include: typeof paymentIntentInclude;
}>;

export type CreatePaymentIntentRecordInput = {
  merchantProfileId: string;
  amountAtomic: string;
  mint: SupportedMint;
  status: "active";
  note: string;
  customerLabel: string | null;
  expiresAt: Date | null;
};

export async function listPaymentIntentRecords(
  merchantProfileId: string,
  limit?: number,
) {
  return db.paymentIntent.findMany({
    where: {
      merchantProfileId,
    },
    include: paymentIntentInclude,
    orderBy: {
      createdAt: "desc",
    },
    ...(limit ? { take: limit } : {}),
  });
}

export async function findPaymentIntentById(
  merchantProfileId: string,
  intentId: string,
) {
  return db.paymentIntent.findFirst({
    where: {
      id: intentId,
      merchantProfileId,
    },
    include: paymentIntentInclude,
  });
}

export async function findPublicPaymentIntentById(intentId: string) {
  return db.paymentIntent.findUnique({
    where: {
      id: intentId,
    },
    include: paymentIntentInclude,
  });
}

export async function createPaymentIntentRecord(
  input: CreatePaymentIntentRecordInput,
) {
  return db.paymentIntent.create({
    data: input,
    include: paymentIntentInclude,
  });
}

export async function updatePaymentIntentRecord(
  merchantProfileId: string,
  intentId: string,
  input: UpdatePaymentIntentRecordInput,
) {
  const existingIntent = await db.paymentIntent.findFirst({
    where: {
      id: intentId,
      merchantProfileId,
    },
    select: {
      id: true,
    },
  });

  if (!existingIntent) {
    return null;
  }

  return db.paymentIntent.update({
    where: {
      id: intentId,
    },
    data: input,
    include: paymentIntentInclude,
  });
}
