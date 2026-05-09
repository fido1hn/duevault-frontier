import type { SerializedInvoice } from "@/features/invoices/types";

export type ComplianceScopePreset = "last_30_days" | "last_month";

export type GrantableInvoicePayment = {
  invoiceId: string;
  invoiceNumber: string;
  client: string;
  amountAtomic: string;
  amountNumber: number;
  createUtxoSignature: string;
  confirmedAt: string;
  network: string;
  mint: string;
};

export type ComplianceScopeSummary = {
  invoiceCount: number;
  transactionCount: number;
  totalAmountNumber: number;
  startDate: string | null;
  endDate: string | null;
};

export function getGrantableInvoicePayments(
  invoices: Pick<
    SerializedInvoice,
    "invoiceId" | "invoiceNumber" | "client" | "amountAtomic" | "amountNumber" | "latestUmbraPayment"
  >[],
): GrantableInvoicePayment[] {
  return invoices.flatMap((invoice) => {
    const payment = invoice.latestUmbraPayment;

    if (!payment || payment.status !== "confirmed" || !payment.confirmedAt) {
      return [];
    }

    return [
      {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client,
        amountAtomic: invoice.amountAtomic,
        amountNumber: invoice.amountNumber,
        createUtxoSignature: payment.createUtxoSignature,
        confirmedAt: payment.confirmedAt,
        network: payment.network,
        mint: payment.mint,
      },
    ];
  });
}

export function toggleInvoicePaymentScope(
  selectedSignatures: string[],
  payment: Pick<GrantableInvoicePayment, "createUtxoSignature">,
) {
  if (selectedSignatures.includes(payment.createUtxoSignature)) {
    return selectedSignatures.filter(
      (signature) => signature !== payment.createUtxoSignature,
    );
  }

  return [...selectedSignatures, payment.createUtxoSignature];
}

function monthRange(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return { start, end };
}

export function applyComplianceScopePreset(
  preset: ComplianceScopePreset,
  payments: GrantableInvoicePayment[],
  now = new Date(),
) {
  const end = now;
  const start =
    preset === "last_30_days"
      ? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
      : monthRange(now).start;
  const exclusiveEnd = preset === "last_month" ? monthRange(now).end : end;

  return payments
    .filter((payment) => {
      const confirmedAt = new Date(payment.confirmedAt);
      return confirmedAt >= start && confirmedAt < exclusiveEnd;
    })
    .map((payment) => payment.createUtxoSignature);
}

export function buildComplianceScopeSummary(
  payments: GrantableInvoicePayment[],
  selectedSignatures: string[],
): ComplianceScopeSummary {
  const selected = payments.filter((payment) =>
    selectedSignatures.includes(payment.createUtxoSignature),
  );
  const invoiceIds = new Set(selected.map((payment) => payment.invoiceId));
  const sortedDates = selected
    .map((payment) => payment.confirmedAt)
    .sort((left, right) => left.localeCompare(right));

  return {
    invoiceCount: invoiceIds.size,
    transactionCount: selected.length,
    totalAmountNumber: selected.reduce(
      (total, payment) => total + payment.amountNumber,
      0,
    ),
    startDate: sortedDates[0] ?? null,
    endDate: sortedDates.at(-1) ?? null,
  };
}
