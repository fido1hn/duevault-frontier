import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  SupportedMint,
  UpdatePaymentIntentRecordInput,
} from "@/features/payment-intents/types";

export type PaymentIntentRecord = Prisma.PaymentIntentGetPayload<object>;

export type CreatePaymentIntentRecordInput = {
  merchantWallet: string;
  amountAtomic: string;
  mint: SupportedMint;
  status: "active";
  note: string;
  customerLabel: string | null;
  expiresAt: Date | null;
};

export async function listPaymentIntentRecords(limit?: number) {
  return db.paymentIntent.findMany({
    orderBy: {
      createdAt: "desc",
    },
    ...(limit ? { take: limit } : {}),
  });
}

export async function findPaymentIntentById(intentId: string) {
  return db.paymentIntent.findUnique({
    where: {
      id: intentId,
    },
  });
}

export async function createPaymentIntentRecord(
  input: CreatePaymentIntentRecordInput,
) {
  return db.paymentIntent.create({
    data: input,
  });
}

export async function updatePaymentIntentRecord(
  intentId: string,
  input: UpdatePaymentIntentRecordInput,
) {
  return db.paymentIntent.update({
    where: {
      id: intentId,
    },
    data: input,
  });
}
