import type {
  InvoiceStatus,
  PublicUmbraPaymentStatus,
} from "@/features/invoices/types";

export type CheckoutPaymentStatusTone =
  | "waiting"
  | "pending"
  | "complete"
  | "settled";
export type CheckoutPaymentStatusStep = 1 | 2 | 3;

export type CheckoutPaymentStatus = {
  rawStatus: InvoiceStatus;
  statusLabel: string;
  statusDescription: string;
  statusTone: CheckoutPaymentStatusTone;
  statusStep: CheckoutPaymentStatusStep;
};

export function mapCheckoutPaymentStatus(
  status: InvoiceStatus,
  latestUmbraPayment?: PublicUmbraPaymentStatus | null,
): CheckoutPaymentStatus {
  if (latestUmbraPayment?.status === "submitted") {
    return {
      rawStatus: status,
      statusLabel: "Payment submitted",
      statusDescription:
        "The customer submitted Umbra payment evidence. The merchant still needs to confirm the claimable UTXO.",
      statusTone: "pending",
      statusStep: 2,
    };
  }

  if (status === "Detected") {
    return {
      rawStatus: status,
      statusLabel: "Payment pending",
      statusDescription:
        "We detected a matching payment and are waiting for it to settle.",
      statusTone: "pending",
      statusStep: 2,
    };
  }

  if (status === "Paid") {
    return {
      rawStatus: status,
      statusLabel: "Payment completed",
      statusDescription: "The invoice payment has been marked as completed.",
      statusTone: "complete",
      statusStep: 3,
    };
  }

  if (status === "Claimed" || status === "Settled") {
    return {
      rawStatus: status,
      statusLabel: "Privately settled",
      statusDescription:
        "The merchant has claimed this payment into their private settlement flow.",
      statusTone: "settled",
      statusStep: 3,
    };
  }

  return {
    rawStatus: status,
    statusLabel: "Awaiting payment",
    statusDescription:
      "Scan the QR code or copy the payment details to complete this invoice.",
    statusTone: "waiting",
    statusStep: 1,
  };
}
