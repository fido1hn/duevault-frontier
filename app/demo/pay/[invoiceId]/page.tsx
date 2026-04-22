import { notFound } from "next/navigation";

import { CheckoutQrPayment } from "@/components/checkout-qr-payment";
import {
  buildSolanaPayUrl,
  getCheckoutPaymentConfig,
  mapCheckoutPaymentStatus,
  type CheckoutPaymentLineItem,
  type CheckoutPaymentViewModel,
} from "@/features/checkout/service";
import { getPaymentMintConfig } from "@/features/payments/mints";

export const dynamic = "force-dynamic";

const DEMO_BUSINESS = {
  name: "North Pier Studio",
};

const DEMO_INVOICE = {
  id: "DV-1007",
  client: "Atlas Labs",
  dueLong: "April 30, 2026",
  amountNumber: 2450,
  status: "Sent",
  lineItems: [
    { id: "1", description: "Product strategy sprint", quantity: 1, price: 1600 },
    { id: "2", description: "Umbra integration advisory", quantity: 1, price: 650 },
    { id: "3", description: "Compliance proof packet", quantity: 1, price: 200 },
  ],
} as const;

type DemoPayPageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

function formatDemoAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function demoInvoiceLineItems(
  mintDisplayName: string,
): CheckoutPaymentLineItem[] {
  return DEMO_INVOICE.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    amountDisplay: `${formatDemoAmount(item.quantity * item.price)} ${mintDisplayName}`,
  }));
}

function buildDemoCheckoutViewModel(): CheckoutPaymentViewModel {
  const paymentConfig = getCheckoutPaymentConfig();
  const mint = paymentConfig.mint ?? getPaymentMintConfig("USDC");
  const memo = `DueVault invoice ${DEMO_INVOICE.id}`;
  const label = DEMO_BUSINESS.name;
  const message = `Payment for invoice ${DEMO_INVOICE.id}`;
  const solanaPayUrl =
    paymentConfig.isConfigured && paymentConfig.mint
      ? buildSolanaPayUrl({
          amountNumber: DEMO_INVOICE.amountNumber,
          label,
          memo,
          message,
          receiverAddress: paymentConfig.receiverAddress,
          mintAddress: paymentConfig.mint.address,
        })
      : null;

  return {
    publicId: null,
    invoiceNumber: DEMO_INVOICE.id,
    merchantName: DEMO_BUSINESS.name,
    amountNumber: DEMO_INVOICE.amountNumber,
    amountDisplay: `${formatDemoAmount(DEMO_INVOICE.amountNumber)} ${mint.displayName}`,
    amountAtomic: null,
    mint: mint.id,
    mintAddress: paymentConfig.mint?.address ?? null,
    mintDisplayName: mint.displayName,
    mintDecimals: mint.decimals,
    isTestMint: mint.isTestMint,
    mintNotice: mint.testnetNotice,
    dueLong: DEMO_INVOICE.dueLong,
    lineItems: demoInvoiceLineItems(mint.displayName),
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
    paymentStatus: mapCheckoutPaymentStatus(DEMO_INVOICE.status),
    configurationError: paymentConfig.isConfigured ? null : paymentConfig.error,
    umbra: null,
  };
}

export default async function DemoPayPage({ params }: DemoPayPageProps) {
  const { invoiceId } = await params;

  if (invoiceId.toLowerCase() !== DEMO_INVOICE.id.toLowerCase()) {
    notFound();
  }

  const checkout = buildDemoCheckoutViewModel();

  return <CheckoutQrPayment checkout={checkout} />;
}
