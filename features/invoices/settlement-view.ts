import type {
  InvoiceStatus,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";

type UmbraPaymentStatus = SerializedUmbraInvoicePayment["status"] | null;

export type InvoiceUmbraSettlementView = {
  action: "awaiting_payment" | "claimed" | "confirm" | "review_claim";
  description: string;
  title: string;
  tone: "pending" | "settled" | "waiting";
};

export function getInvoiceUmbraSettlementView(
  invoiceStatus: InvoiceStatus,
  latestPaymentStatus: UmbraPaymentStatus,
): InvoiceUmbraSettlementView {
  if (invoiceStatus === "Claimed" || invoiceStatus === "Settled") {
    return {
      action: "claimed",
      description:
        "This payment has been claimed into the merchant private balance.",
      title: "Private Settlement Claimed",
      tone: "settled",
    };
  }

  if (latestPaymentStatus === "submitted") {
    return {
      action: "confirm",
      description:
        "A customer payment transaction was submitted. Confirm the merchant wallet can claim the matching UTXO before detection.",
      title: "Umbra Payment Submitted",
      tone: "pending",
    };
  }

  if (latestPaymentStatus === "confirmed") {
    return {
      action: "review_claim",
      description:
        "The merchant wallet confirmed this claimable UTXO. You can continue to settlement.",
      title: "Umbra Payment Confirmed",
      tone: "pending",
    };
  }

  return {
    action: "awaiting_payment",
    description:
      "Customer payment detection now records confirmed Umbra checkout signatures. Merchant claiming stays in the settlement slice.",
    title: "Awaiting Umbra Payment",
    tone: "waiting",
  };
}
