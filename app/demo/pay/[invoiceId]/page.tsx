import { notFound } from "next/navigation";

import { CheckoutQrPayment } from "@/components/checkout-qr-payment";
import { buildDemoCheckoutViewModel } from "@/features/checkout/demo";

export const dynamic = "force-dynamic";

const DEMO_INVOICE = {
  id: "DV-1007",
} as const;

type DemoPayPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export default async function DemoPayPage({ params }: DemoPayPageProps) {
  const { invoiceId } = await params;

  if (invoiceId.toLowerCase() !== DEMO_INVOICE.id.toLowerCase()) {
    notFound();
  }

  const checkout = buildDemoCheckoutViewModel();

  return <CheckoutQrPayment checkout={checkout} />;
}
