import { CheckoutQrPayment } from "@/components/checkout-qr-payment";
import {
  buildSolanaPayUrl,
  getCheckoutPaymentConfig,
  mapCheckoutPaymentStatus,
  type CheckoutPaymentSource,
  type CheckoutPaymentLineItem,
  type CheckoutPaymentViewModel,
} from "@/features/checkout/service";
import { business, formatUsdc, getInvoiceById } from "@/fixtures/demo-data";
import { getInvoiceByNumber } from "@/features/invoices/service";
import type { SerializedInvoice } from "@/features/invoices/types";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{
    intentId: string;
  }>;
};

function realInvoiceLineItems(invoice: SerializedInvoice): CheckoutPaymentLineItem[] {
  return invoice.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    amountDisplay: `${item.totalDisplay} ${invoice.mint}`,
  }));
}

function demoInvoiceLineItems(
  invoice: ReturnType<typeof getInvoiceById>,
): CheckoutPaymentLineItem[] {
  return invoice.lineItems.map((item) => ({
    id: String(item.id),
    description: item.description,
    quantity: item.quantity,
    amountDisplay: `${formatUsdc(item.quantity * item.price)} USDC`,
  }));
}

async function getCheckoutInvoice(intentId: string) {
  try {
    const invoice = await getInvoiceByNumber(intentId);

    if (invoice) {
      return {
        source: "database" as CheckoutPaymentSource,
        invoiceNumber: invoice.invoiceNumber,
        amountNumber: invoice.amountNumber,
        amountDisplay: invoice.amount,
        mint: invoice.mint,
        dueLong: invoice.dueLong,
        lineItems: realInvoiceLineItems(invoice),
        status: invoice.status,
      };
    }
  } catch {
    // Invalid invoice IDs can still fall back to the demo checkout experience.
  }

  const invoice = getInvoiceById(intentId);

  return {
    source: "demo" as CheckoutPaymentSource,
    invoiceNumber: invoice.id,
    amountNumber: invoice.amountNumber,
    amountDisplay: invoice.amount,
    mint: "USDC",
    dueLong: invoice.dueLong,
    lineItems: demoInvoiceLineItems(invoice),
    status: invoice.status,
  };
}

function buildCheckoutViewModel(
  invoice: Awaited<ReturnType<typeof getCheckoutInvoice>>,
): CheckoutPaymentViewModel {
  const paymentConfig = getCheckoutPaymentConfig();
  const memo = `DueVault invoice ${invoice.invoiceNumber}`;
  const label = business.name;
  const message = `Payment for invoice ${invoice.invoiceNumber}`;
  const solanaPayUrl = paymentConfig.isConfigured
    ? buildSolanaPayUrl({
        amountNumber: invoice.amountNumber,
        label,
        memo,
        message,
        receiverAddress: paymentConfig.receiverAddress,
        usdcMint: paymentConfig.usdcMint,
      })
    : null;

  return {
    invoiceNumber: invoice.invoiceNumber,
    merchantName: business.name,
    amountNumber: invoice.amountNumber,
    amountDisplay: invoice.amountDisplay,
    mint: invoice.mint,
    dueLong: invoice.dueLong,
    lineItems: invoice.lineItems,
    receiverAddress: paymentConfig.receiverAddress,
    solanaPayUrl,
    memo,
    label,
    message,
    source: invoice.source,
    statusEndpoint:
      invoice.source === "database"
        ? `/api/invoices/${encodeURIComponent(invoice.invoiceNumber)}`
        : null,
    paymentStatus: mapCheckoutPaymentStatus(invoice.status),
    configurationError: paymentConfig.isConfigured ? null : paymentConfig.error,
  };
}

export default async function PayPage({ params }: PayPageProps) {
  const { intentId } = await params;
  const invoice = await getCheckoutInvoice(intentId);
  const checkout = buildCheckoutViewModel(invoice);

  return <CheckoutQrPayment checkout={checkout} />;
}
