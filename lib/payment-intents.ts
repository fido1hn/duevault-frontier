import { db } from "@/lib/db";

export const PAYMENT_INTENT_STATUSES = [
  "draft",
  "active",
  "paid",
  "claimed",
  "expired",
] as const;

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export const SUPPORTED_MINTS = ["USDC"] as const;
export type SupportedMint = (typeof SUPPORTED_MINTS)[number];

export type SerializedPaymentIntent = {
  id: string;
  merchantWallet: string;
  amountAtomic: string;
  mint: string;
  status: PaymentIntentStatus;
  note: string;
  customerLabel: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentIntentInput = {
  merchantWallet: string;
  amountAtomic: string;
  mint?: SupportedMint;
  note?: string;
  customerLabel?: string | null;
  expiresAt?: string | null;
};

export type UpdatePaymentIntentInput = {
  status?: PaymentIntentStatus;
  note?: string;
  customerLabel?: string | null;
  expiresAt?: string | null;
};

function assertPaymentIntentStatus(value: string): asserts value is PaymentIntentStatus {
  if (!PAYMENT_INTENT_STATUSES.includes(value as PaymentIntentStatus)) {
    throw new Error("Invalid payment request status.");
  }
}

function parseOptionalDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiry date.");
  }

  return date;
}

function sanitizeAmountAtomic(value: string) {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error("Amount must be an integer string in atomic units.");
  }

  if (normalized === "0") {
    throw new Error("Amount must be greater than zero.");
  }

  return normalized;
}

function sanitizeMerchantWallet(value: string) {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error("Merchant wallet is required.");
  }

  return normalized;
}

export function serializePaymentIntent(intent: {
  id: string;
  merchantWallet: string;
  amountAtomic: string;
  mint: string;
  status: string;
  note: string;
  customerLabel: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedPaymentIntent {
  assertPaymentIntentStatus(intent.status);

  return {
    id: intent.id,
    merchantWallet: intent.merchantWallet,
    amountAtomic: intent.amountAtomic,
    mint: intent.mint,
    status: intent.status,
    note: intent.note,
    customerLabel: intent.customerLabel,
    expiresAt: intent.expiresAt?.toISOString() ?? null,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
  };
}

export async function listPaymentIntents(limit?: number) {
  const intents = await db.paymentIntent.findMany({
    orderBy: {
      createdAt: "desc",
    },
    ...(limit ? { take: limit } : {}),
  });

  return intents.map(serializePaymentIntent);
}

export async function getPaymentIntentById(intentId: string) {
  const intent = await db.paymentIntent.findUnique({
    where: {
      id: intentId,
    },
  });

  return intent ? serializePaymentIntent(intent) : null;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  const intent = await db.paymentIntent.create({
    data: {
      merchantWallet: sanitizeMerchantWallet(input.merchantWallet),
      amountAtomic: sanitizeAmountAtomic(input.amountAtomic),
      mint: input.mint ?? "USDC",
      status: "active",
      note: input.note?.trim() ?? "",
      customerLabel: input.customerLabel?.trim() || null,
      expiresAt: parseOptionalDate(input.expiresAt),
    },
  });

  return serializePaymentIntent(intent);
}

export async function updatePaymentIntent(
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

  const intent = await db.paymentIntent.update({
    where: {
      id: intentId,
    },
    data,
  });

  return serializePaymentIntent(intent);
}
