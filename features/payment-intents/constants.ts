import { PAYMENT_MINT_IDS } from "@/features/payments/mints";

export const PAYMENT_INTENT_STATUSES = [
  "draft",
  "active",
  "paid",
  "claimed",
  "expired",
] as const;

export const SUPPORTED_MINTS = PAYMENT_MINT_IDS;
