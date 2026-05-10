import type { SerializedInvoice } from "@/features/invoices/types";

const TRAILING_DIGITS = /^(.*?)(\d+)$/;

export function computeNextInvoiceNumber(
  invoices: readonly SerializedInvoice[] | undefined,
): string {
  if (!invoices || invoices.length === 0) return "INV-0001";

  const mostRecent = [...invoices].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  const match = mostRecent.invoiceNumber.match(TRAILING_DIGITS);
  if (!match) return "";

  const [, prefix, digits] = match;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return (prefix + next).toUpperCase();
}
