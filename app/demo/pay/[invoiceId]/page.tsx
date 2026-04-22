import { notFound } from "next/navigation";

import { CheckoutQrPayment } from "@/components/checkout-qr-payment";
import {
  buildSolanaPayUrl,
  getCheckoutPaymentConfig,
  mapCheckoutPaymentStatus,
  type CheckoutPaymentLineItem,
  type CheckoutPaymentViewModel,
} from "@/features/checkout/service";
import { business, formatUsdc, invoices } from "@/fixtures/demo-data";
import { getPaymentMintConfig } from "@/features/payments/mints";

export const dynamic = "force-dynamic";

type DemoPayPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

type DemoInvoice = (typeof invoices)[number];

function demoInvoiceLineItems(
  invoice: DemoInvoice,
  mintDisplayName: string,
): CheckoutPaymentLineItem[] {
  return invoice.lineItems.map((item) => ({
    id: String(item.id),
    description: item.description,
    quantity: item.quantity,
    amountDisplay: `${formatUsdc(item.quantity * item.price)} ${mintDisplayName}`,
  }));
}

function findDemoInvoice(invoiceId: string) {
  return (
    invoices.find(
      (invoice) => invoice.id.toLowerCase() === invoiceId.toLowerCase(),
    ) ?? null
  );
}

function buildDemoCheckoutViewModel(
  invoice: DemoInvoice,
): CheckoutPaymentViewModel {
  const paymentConfig = getCheckoutPaymentConfig();
  const mint = paymentConfig.mint ?? getPaymentMintConfig("USDC");
  const memo = `DueVault invoice ${invoice.id}`;
  const label = business.name;
  const message = `Payment for invoice ${invoice.id}`;
  const solanaPayUrl = paymentConfig.isConfigured && paymentConfig.mint
    ? buildSolanaPayUrl({
        amountNumber: invoice.amountNumber,
        label,
        memo,
        message,
        receiverAddress: paymentConfig.receiverAddress,
        mintAddress: paymentConfig.mint.address,
      })
    : null;

  return {
    publicId: null,
    invoiceNumber: invoice.id,
    merchantName: business.name,
    amountNumber: invoice.amountNumber,
    amountDisplay: `${formatUsdc(invoice.amountNumber)} ${mint.displayName}`,
    amountAtomic: null,
    mint: mint.id,
    mintAddress: paymentConfig.mint?.address ?? null,
    mintDisplayName: mint.displayName,
    mintDecimals: mint.decimals,
    isTestMint: mint.isTestMint,
    mintNotice: mint.testnetNotice,
    dueLong: invoice.dueLong,
    lineItems: demoInvoiceLineItems(invoice, mint.displayName),
    receiverAddress: paymentConfig.isConfigured
      ? paymentConfig.receiverAddress
      : null,
    solanaPayUrl,
    memo,
    label,
    message,
    source: "demo",
    privacyRail: "none",
    paymentMode: "solana_pay",
    statusEndpoint: null,
    paymentStatus: mapCheckoutPaymentStatus(invoice.status),
    configurationError: paymentConfig.isConfigured ? null : paymentConfig.error,
    umbra: null,
  };
}

export default async function DemoPayPage({ params }: DemoPayPageProps) {
  const { invoiceId } = await params;
  const invoice = findDemoInvoice(invoiceId);

  if (!invoice) {
    notFound();
  }

  const checkout = buildDemoCheckoutViewModel(invoice);

  return <CheckoutQrPayment checkout={checkout} />;
}
