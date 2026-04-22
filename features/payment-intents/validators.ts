import {
  PAYMENT_INTENT_STATUSES,
  SUPPORTED_MINTS,
} from "@/features/payment-intents/constants";
import type {
  PaymentIntentStatus,
  SupportedMint,
} from "@/features/payment-intents/types";

export function assertPaymentIntentStatus(
  value: string,
): asserts value is PaymentIntentStatus {
  if (!PAYMENT_INTENT_STATUSES.includes(value as PaymentIntentStatus)) {
    throw new Error("Invalid payment request status.");
  }
}

export function assertSupportedMint(value: string): asserts value is SupportedMint {
  if (!SUPPORTED_MINTS.includes(value as SupportedMint)) {
    throw new Error("Unsupported payment request mint.");
  }
}

export function parseOptionalDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiry date.");
  }

  return date;
}

export function sanitizeAmountAtomic(value: string) {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error("Amount must be an integer string in atomic units.");
  }

  if (normalized === "0") {
    throw new Error("Amount must be greater than zero.");
  }

  return normalized;
}

export function sanitizeMerchantWallet(value: string) {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error("Merchant wallet is required.");
  }

  return normalized;
}
