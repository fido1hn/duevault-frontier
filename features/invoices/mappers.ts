import type { InvoiceRecord } from "@/features/invoices/repository";
import type { SerializedInvoice } from "@/features/invoices/types";
import {
  assertInvoiceMint,
  assertInvoiceStatus,
  assertPaymentRail,
  assertPrivacyRail,
  atomicToNumber,
} from "@/features/invoices/validators";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function formatUsdcValue(value: number) {
  return amountFormatter.format(value);
}

export function serializeInvoice(invoice: InvoiceRecord): SerializedInvoice {
  assertInvoiceStatus(invoice.status);
  assertPaymentRail(invoice.paymentRail);
  assertPrivacyRail(invoice.privacyRail);
  assertInvoiceMint(invoice.mint);

  const amountNumber = atomicToNumber(invoice.totalAmountAtomic);

  return {
    id: invoice.invoiceNumber,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.customerName,
    clientEmail: invoice.customerEmail,
    issued: shortDateFormatter.format(invoice.issuedAt),
    due: shortDateFormatter.format(invoice.dueAt),
    dueLong: longDateFormatter.format(invoice.dueAt),
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt.toISOString(),
    amount: `${formatUsdcValue(amountNumber)} ${invoice.mint}`,
    amountNumber,
    amountAtomic: invoice.totalAmountAtomic,
    status: invoice.status,
    notes: invoice.notes,
    paymentRail: invoice.paymentRail,
    privacyRail: invoice.privacyRail,
    mint: invoice.mint,
    lineItems: invoice.lineItems.map((item) => {
      const price = atomicToNumber(item.unitAmountAtomic);
      const totalAtomic = (
        BigInt(item.unitAmountAtomic) * BigInt(item.quantity)
      ).toString();
      const total = atomicToNumber(totalAtomic);

      return {
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price,
        priceAtomic: item.unitAmountAtomic,
        priceDisplay: formatUsdcValue(price),
        total,
        totalAtomic,
        totalDisplay: formatUsdcValue(total),
        sortOrder: item.sortOrder,
      };
    }),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
