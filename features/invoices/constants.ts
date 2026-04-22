import { PAYMENT_MINT_IDS } from "@/features/payments/mints";

export const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Paid",
  "Detected",
  "Claimed",
  "Settled",
  "Overdue",
] as const;

export const PAYMENT_RAILS = ["solana"] as const;
export const PRIVACY_RAILS = ["umbra", "none"] as const;
export const INVOICE_MINTS = PAYMENT_MINT_IDS;
