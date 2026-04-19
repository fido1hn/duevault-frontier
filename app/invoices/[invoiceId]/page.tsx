import { AppLayout } from "@/components/layout/app-layout";
import { InvoiceDetailClient } from "@/features/invoices/components/invoice-detail-client";
import { getInvoiceByNumber } from "@/features/invoices/service";
import type { SerializedInvoice } from "@/features/invoices/types";

export const dynamic = "force-dynamic";

type InvoiceDetailPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

async function loadInvoice(invoiceId: string): Promise<{
  invoice: SerializedInvoice | null;
  error?: string;
}> {
  try {
    const invoice = await getInvoiceByNumber(invoiceId);

    return {
      invoice,
      error: invoice ? undefined : "Invoice not found.",
    };
  } catch (error) {
    return {
      invoice: null,
      error: error instanceof Error ? error.message : "Unable to load invoice.",
    };
  }
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const { invoice, error } = await loadInvoice(invoiceId);

  return (
    <AppLayout>
      <InvoiceDetailClient invoice={invoice} error={error} />
    </AppLayout>
  );
}
