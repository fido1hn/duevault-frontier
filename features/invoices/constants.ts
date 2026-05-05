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

export const CLAIM_STATUSES = ["pending", "failed", "confirmed"] as const;

// Keyed-lookup helpers so route handlers read like `INVOICE_STATUS.Detected`
// instead of a free-floating string literal. The `satisfies` constraint ties
// each entry to the source-of-truth array — drift fails at compile time.
export const INVOICE_STATUS = {
  Draft: "Draft",
  Sent: "Sent",
  Viewed: "Viewed",
  Paid: "Paid",
  Detected: "Detected",
  Claimed: "Claimed",
  Settled: "Settled",
  Overdue: "Overdue",
} as const satisfies Record<string, (typeof INVOICE_STATUSES)[number]>;

export const CLAIM_STATUS = {
  Pending: "pending",
  Failed: "failed",
  Confirmed: "confirmed",
} as const satisfies Record<string, (typeof CLAIM_STATUSES)[number]>;

export const PAYMENT_RAILS = ["solana"] as const;
export const PRIVACY_RAILS = ["umbra", "none"] as const;
export const INVOICE_MINTS = PAYMENT_MINT_IDS;
