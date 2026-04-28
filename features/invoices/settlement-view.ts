import type {
  InvoiceStatus,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";

type UmbraPaymentStatus = SerializedUmbraInvoicePayment["status"] | null;

export type InvoiceUmbraSettlementView = {
  action: "awaiting_payment" | "claimed" | "continue_to_settlement";
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

  if (
    latestPaymentStatus === "submitted" ||
    latestPaymentStatus === "confirmed"
  ) {
    return {
      action: "continue_to_settlement",
      description:
        "A customer payment is ready for the merchant wallet to scan and claim into the private balance.",
      title:
        latestPaymentStatus === "confirmed"
          ? "Umbra Payment Confirmed"
          : "Umbra Payment Submitted",
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
