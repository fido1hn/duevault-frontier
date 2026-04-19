import { AppLayout } from "@/components/layout/app-layout";
import { InvoicesClient } from "@/features/invoices/components/invoices-client";
import { listInvoices } from "@/features/invoices/service";
import type { SerializedInvoice } from "@/features/invoices/types";

export const dynamic = "force-dynamic";

async function loadInvoices(): Promise<{
  invoices: SerializedInvoice[];
  error?: string;
}> {
  try {
    return {
      invoices: await listInvoices(),
    };
  } catch (error) {
    return {
      invoices: [],
      error:
        error instanceof Error ? error.message : "Unable to load invoices.",
    };
  }
}

export default async function InvoicesPage() {
  const { invoices, error } = await loadInvoices();

  return (
    <AppLayout>
      <InvoicesClient initialInvoices={invoices} initialError={error} />
    </AppLayout>
  );
}
