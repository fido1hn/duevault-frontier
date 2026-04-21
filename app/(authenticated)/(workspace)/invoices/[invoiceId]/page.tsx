import { InvoiceDetailClient } from "@/features/invoices/components/invoice-detail-client";

export const dynamic = "force-dynamic";

type InvoiceDetailPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { invoiceId } = await params;

  return <InvoiceDetailClient invoiceId={invoiceId} />;
}
