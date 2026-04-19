import "server-only";

import { serializePaymentIntent } from "@/features/payment-intents/mappers";
import {
  createPaymentIntentRecord,
  findPaymentIntentById,
  listPaymentIntentRecords,
  updatePaymentIntentRecord,
} from "@/features/payment-intents/repository";
import type {
  CreatePaymentIntentInput,
  PaymentIntentStatus,
  UpdatePaymentIntentInput,
} from "@/features/payment-intents/types";
import {
  assertPaymentIntentStatus,
  parseOptionalDate,
  sanitizeAmountAtomic,
} from "@/features/payment-intents/validators";

export async function listPaymentIntents(
  merchantProfileId: string,
  limit?: number,
) {
  const intents = await listPaymentIntentRecords(merchantProfileId, limit);

  return intents.map(serializePaymentIntent);
}

export async function getPaymentIntentById(
  merchantProfileId: string,
  intentId: string,
) {
  const intent = await findPaymentIntentById(merchantProfileId, intentId);

  return intent ? serializePaymentIntent(intent) : null;
}

export async function createPaymentIntent(
  merchantProfileId: string,
  input: CreatePaymentIntentInput,
) {
  const intent = await createPaymentIntentRecord({
    merchantProfileId,
    amountAtomic: sanitizeAmountAtomic(input.amountAtomic),
    mint: input.mint ?? "USDC",
    status: "active",
    note: input.note?.trim() ?? "",
    customerLabel: input.customerLabel?.trim() || null,
    expiresAt: parseOptionalDate(input.expiresAt),
  });

  return serializePaymentIntent(intent);
}

export async function updatePaymentIntent(
  merchantProfileId: string,
  intentId: string,
  input: UpdatePaymentIntentInput,
) {
  const data: {
    status?: PaymentIntentStatus;
    note?: string;
    customerLabel?: string | null;
    expiresAt?: Date | null;
  } = {};

  if (input.status !== undefined) {
    assertPaymentIntentStatus(input.status);
    data.status = input.status;
  }

  if (input.note !== undefined) {
    data.note = input.note.trim();
  }

  if (input.customerLabel !== undefined) {
    data.customerLabel = input.customerLabel?.trim() || null;
  }

  if (input.expiresAt !== undefined) {
    data.expiresAt = parseOptionalDate(input.expiresAt);
  }

  const intent = await updatePaymentIntentRecord(
    merchantProfileId,
    intentId,
    data,
  );

  if (!intent) {
    throw new Error("Payment request not found.");
  }

  return serializePaymentIntent(intent);
}
