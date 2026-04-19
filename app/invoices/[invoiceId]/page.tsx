import { AppLayout } from "@/components/layout/app-layout";
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

  return (
    <AppLayout>
      <InvoiceDetailClient invoiceId={invoiceId} />
    </AppLayout>
  );
}
