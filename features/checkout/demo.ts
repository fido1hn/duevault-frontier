import type {
  CheckoutPaymentLineItem,
  CheckoutPaymentViewModel,
} from "@/features/checkout/service";
import { buildUmbraInvoiceOptionalData } from "@/features/checkout/service";
import {
  getCheckoutPaymentDisplayStatus,
  mapCheckoutPaymentStatus,
} from "@/features/checkout/status";
import { getPaymentMintConfig } from "@/features/payments/mints";

const DEMO_BUSINESS = {
  name: "North Pier Studio",
};

const DEMO_INVOICE = {
  id: "DV-1007",
  dueLong: "April 30, 2026",
  amountNumber: 2450,
  status: "Sent",
  lineItems: [
    { id: "1", description: "Product strategy sprint", quantity: 1, price: 1600 },
    { id: "2", description: "Umbra integration advisory", quantity: 1, price: 650 },
    { id: "3", description: "Compliance proof packet", quantity: 1, price: 200 },
  ],
} as const;

export const DEMO_CHECKOUT_NOTICE =
  "This is a mainnet Umbra payment preview. No action is required.";
export const DEMO_UMBRA_NETWORK = "mainnet";
export const DEMO_MERCHANT_RECEIVER_ADDRESS =
  "H6C55scp2z5ndmPXw5qYL4dKwQPQeCWBGRGKSpiVdBxY";

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

export function buildDemoCheckoutViewModel(): CheckoutPaymentViewModel {
  const mint = getPaymentMintConfig("USDC");
  const memo = `DueVault invoice ${DEMO_INVOICE.id}`;
  const label = DEMO_BUSINESS.name;
  const message = `Payment for invoice ${DEMO_INVOICE.id}`;
  const paymentStatus = getCheckoutPaymentDisplayStatus(
    mapCheckoutPaymentStatus(DEMO_INVOICE.status),
    "demo",
  );

  return {
    publicId: DEMO_INVOICE.id,
    invoiceNumber: DEMO_INVOICE.id,
    merchantName: DEMO_BUSINESS.name,
    amountNumber: DEMO_INVOICE.amountNumber,
    amountDisplay: `${formatDemoAmount(DEMO_INVOICE.amountNumber)} ${mint.displayName}`,
    amountAtomic: "2450000000",
    mint: mint.id,
    mintAddress: mint.addresses.mainnet ?? null,
    mintDisplayName: mint.displayName,
    mintDecimals: mint.decimals,
    isTestMint: mint.isTestMint,
    mintNotice: null,
    dueLong: DEMO_INVOICE.dueLong,
    lineItems: demoInvoiceLineItems(mint.displayName),
    receiverAddress: DEMO_MERCHANT_RECEIVER_ADDRESS,
    solanaPayUrl: null,
    memo,
    label,
    message,
    source: "demo",
    privacyRail: "umbra",
    presentationMode: "demo",
    demoNotice: DEMO_CHECKOUT_NOTICE,
    paymentMode: "umbra",
    statusEndpoint: null,
    paymentStatus,
    configurationError: null,
    umbra: {
      publicId: DEMO_INVOICE.id,
      network: DEMO_UMBRA_NETWORK,
      merchantStatus: "ready",
      merchantReady: true,
      merchantWalletAddress: DEMO_MERCHANT_RECEIVER_ADDRESS,
      amountAtomic: "2450000000",
      mintAddress: mint.addresses.mainnet ?? null,
      mintDisplayName: mint.displayName,
      mintDecimals: mint.decimals,
      isTestMint: false,
      mintNotice: null,
      optionalData: buildUmbraInvoiceOptionalData(DEMO_INVOICE.id),
      latestPayment: null,
    },
  };
}
