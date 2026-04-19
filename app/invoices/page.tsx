import { AppLayout } from "@/components/layout/app-layout";
import { InvoicesClient } from "@/features/invoices/components/invoices-client";

export const dynamic = "force-dynamic";

export default function InvoicesPage() {
  return (
    <AppLayout>
      <InvoicesClient />
    </AppLayout>
  );
}
