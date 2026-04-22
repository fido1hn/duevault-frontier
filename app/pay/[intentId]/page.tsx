import { notFound } from "next/navigation";

import { CheckoutQrPayment } from "@/components/checkout-qr-payment";
import {
  buildSolanaPayUrl,
  buildUmbraInvoiceOptionalData,
  getCheckoutPaymentConfig,
  mapCheckoutPaymentStatus,
  type CheckoutPaymentLineItem,
  type CheckoutPaymentSource,
  type CheckoutPaymentViewModel,
} from "@/features/checkout/service";
import {
  formatPaymentMintValue,
  serializePublicUmbraPaymentStatus,
} from "@/features/invoices/mappers";
import { getInvoiceByPublicId } from "@/features/invoices/service";
import type {
  InvoiceStatus,
  PublicUmbraPaymentStatus,
  PrivacyRail,
  SerializedInvoice,
} from "@/features/invoices/types";
import { atomicToNumber } from "@/features/invoices/validators";
import type {
  UmbraNetwork,
  UmbraRegistrationStatus,
} from "@/features/merchant-profiles/types";
import { getPublicActivePaymentIntentById } from "@/features/payment-intents/service";
import type { SerializedPaymentIntent } from "@/features/payment-intents/types";
import {
  getPaymentMintConfig,
  type PaymentMintId,
} from "@/features/payments/mints";

export const dynamic = "force-dynamic";

type PayPageProps = {
  params: Promise<{
    intentId: string;
  }>;
};

type CheckoutRecord = {
  source: CheckoutPaymentSource;
  publicId: string | null;
  receiverAddress: string | null;
  merchantName: string;
  invoiceNumber: string;
  amountNumber: number;
  amountAtomic: string | null;
  amountDisplay: string;
  mint: PaymentMintId;
  privacyRail: PrivacyRail;
  dueLong: string;
  lineItems: CheckoutPaymentLineItem[];
  status: InvoiceStatus;
  merchantUmbraNetwork: UmbraNetwork;
  merchantUmbraStatus: UmbraRegistrationStatus;
  merchantUmbraWalletAddress: string | null;
  latestUmbraPayment: PublicUmbraPaymentStatus | null;
};

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function realInvoiceLineItems(invoice: SerializedInvoice): CheckoutPaymentLineItem[] {
  const mint = getPaymentMintConfig(invoice.mint);

  return invoice.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    amountDisplay: `${item.totalDisplay} ${mint.displayName}`,
  }));
}

function paymentIntentLineItems(
  intent: SerializedPaymentIntent,
): CheckoutPaymentLineItem[] {
  const amountNumber = atomicToNumber(intent.amountAtomic, intent.mint);
  const mint = getPaymentMintConfig(intent.mint);

  return [
    {
      id: intent.id,
      description:
        intent.note || intent.customerLabel || `Payment request ${intent.id}`,
      quantity: 1,
      amountDisplay: `${formatPaymentMintValue(amountNumber, intent.mint)} ${mint.displayName}`,
    },
  ];
}

function paymentIntentDueLabel(intent: SerializedPaymentIntent) {
  return intent.expiresAt
    ? longDateFormatter.format(new Date(intent.expiresAt))
    : "on receipt";
}

function databaseInvoiceToCheckoutRecord(
  invoice: SerializedInvoice,
): CheckoutRecord {
  return {
    source: "database",
    publicId: invoice.publicId,
    receiverAddress: null,
    merchantName: invoice.merchantName,
    invoiceNumber: invoice.invoiceNumber,
    amountNumber: invoice.amountNumber,
    amountAtomic: invoice.amountAtomic,
    amountDisplay: invoice.amount,
    mint: invoice.mint,
    privacyRail: invoice.privacyRail,
    dueLong: invoice.dueLong,
    lineItems: realInvoiceLineItems(invoice),
    status: invoice.status,
    merchantUmbraNetwork: invoice.merchantUmbraNetwork,
    merchantUmbraStatus: invoice.merchantUmbraStatus,
    merchantUmbraWalletAddress: invoice.merchantUmbraWalletAddress,
    latestUmbraPayment: serializePublicUmbraPaymentStatus(
      invoice.latestUmbraPayment,
    ),
  };
}

function paymentIntentToCheckoutRecord(
  intent: SerializedPaymentIntent,
): CheckoutRecord {
  const amountNumber = atomicToNumber(intent.amountAtomic, intent.mint);
  const mint = getPaymentMintConfig(intent.mint);

  return {
    source: "payment_intent",
    publicId: null,
    receiverAddress: intent.merchantWallet,
    merchantName: intent.merchantName,
    invoiceNumber: intent.id,
    amountNumber,
    amountAtomic: intent.amountAtomic,
    amountDisplay: `${formatPaymentMintValue(amountNumber, intent.mint)} ${mint.displayName}`,
    mint: intent.mint,
    privacyRail: "none",
    dueLong: paymentIntentDueLabel(intent),
    lineItems: paymentIntentLineItems(intent),
    status: "Sent",
    merchantUmbraNetwork: "devnet",
    merchantUmbraStatus: "not_setup",
    merchantUmbraWalletAddress: null,
    latestUmbraPayment: null,
  };
}

async function getCheckoutRecord(intentId: string) {
  const invoice = await getInvoiceByPublicId(intentId);

  if (invoice) {
    return databaseInvoiceToCheckoutRecord(invoice);
  }

  const paymentIntent = await getPublicActivePaymentIntentById(intentId);

  return paymentIntent ? paymentIntentToCheckoutRecord(paymentIntent) : null;
}

function getConfigurationError({
  isUmbraCheckout,
  invoiceMint,
  invoiceNetwork,
  paymentConfig,
  receiverAddress,
}: {
  isUmbraCheckout: boolean;
  invoiceMint: PaymentMintId;
  invoiceNetwork: UmbraNetwork;
  paymentConfig: ReturnType<typeof getCheckoutPaymentConfig>;
  receiverAddress: string | null;
}) {
  if (!paymentConfig.mint) {
    return paymentConfig.isConfigured
      ? "Checkout mint is not configured correctly."
      : paymentConfig.error;
  }

  if (invoiceMint !== paymentConfig.mint.id) {
    const invoiceMintConfig = getPaymentMintConfig(invoiceMint);

    return `${invoiceMintConfig.displayName} is not the configured checkout mint for ${paymentConfig.network}.`;
  }

  if (isUmbraCheckout) {
    if (invoiceNetwork !== paymentConfig.network) {
      return `Merchant Umbra setup is for ${invoiceNetwork}, but checkout is configured for ${paymentConfig.network}.`;
    }

    return null;
  }

  if (!receiverAddress) {
    return paymentConfig.isConfigured
      ? "Payment address not configured."
      : paymentConfig.error;
  }

  return null;
}

function buildCheckoutViewModel(invoice: CheckoutRecord): CheckoutPaymentViewModel {
  const paymentConfig = getCheckoutPaymentConfig();
  const memo =
    invoice.source === "payment_intent"
      ? `DueVault payment request ${invoice.invoiceNumber}`
      : `DueVault invoice ${invoice.invoiceNumber}`;
  const label = invoice.merchantName;
  const message =
    invoice.source === "payment_intent"
      ? `Payment request ${invoice.invoiceNumber}`
      : `Payment for invoice ${invoice.invoiceNumber}`;
  const isUmbraCheckout =
    invoice.source === "database" &&
    invoice.publicId !== null &&
    invoice.privacyRail === "umbra";
  const solanaPayReceiverAddress =
    invoice.source === "payment_intent"
      ? invoice.receiverAddress
      : paymentConfig.isConfigured
        ? paymentConfig.receiverAddress
        : null;
  const checkoutReceiverAddress = isUmbraCheckout
    ? invoice.merchantUmbraWalletAddress
    : solanaPayReceiverAddress;
  const configurationError = getConfigurationError({
    isUmbraCheckout,
    invoiceMint: invoice.mint,
    invoiceNetwork: invoice.merchantUmbraNetwork,
    paymentConfig,
    receiverAddress: checkoutReceiverAddress,
  });
  const recordMint = getPaymentMintConfig(invoice.mint);
  const configuredMintAddress =
    paymentConfig.mint && invoice.mint === paymentConfig.mint.id
      ? paymentConfig.mint.address
      : null;
  const solanaPayUrl =
    !configurationError &&
    !isUmbraCheckout &&
    solanaPayReceiverAddress &&
    configuredMintAddress
      ? buildSolanaPayUrl({
          amountNumber: invoice.amountNumber,
          label,
          memo,
          message,
          receiverAddress: solanaPayReceiverAddress,
          mintAddress: configuredMintAddress,
        })
      : null;
  const umbraMerchantReady =
    invoice.merchantUmbraStatus === "ready" &&
    invoice.merchantUmbraWalletAddress !== null;

  return {
    publicId: invoice.publicId,
    invoiceNumber: invoice.invoiceNumber,
    merchantName: invoice.merchantName,
    amountNumber: invoice.amountNumber,
    amountDisplay: invoice.amountDisplay,
    amountAtomic: invoice.amountAtomic,
    mint: invoice.mint,
    mintAddress: configuredMintAddress,
    mintDisplayName: recordMint.displayName,
    mintDecimals: recordMint.decimals,
    isTestMint: recordMint.isTestMint,
    mintNotice: recordMint.testnetNotice,
    dueLong: invoice.dueLong,
    lineItems: invoice.lineItems,
    receiverAddress: checkoutReceiverAddress,
    solanaPayUrl,
    memo,
    label,
    message,
    source: invoice.source,
    privacyRail: invoice.privacyRail,
    paymentMode: isUmbraCheckout ? "umbra" : "solana_pay",
    statusEndpoint:
      invoice.source === "database" && invoice.publicId
        ? `/api/checkout/${encodeURIComponent(invoice.publicId)}`
        : null,
    paymentStatus: mapCheckoutPaymentStatus(
      invoice.status,
      invoice.latestUmbraPayment,
    ),
    configurationError,
    umbra:
      isUmbraCheckout && invoice.amountAtomic && invoice.publicId
        ? {
            publicId: invoice.publicId,
            network: invoice.merchantUmbraNetwork,
            merchantStatus: invoice.merchantUmbraStatus,
            merchantReady: umbraMerchantReady,
            merchantWalletAddress: invoice.merchantUmbraWalletAddress,
            amountAtomic: invoice.amountAtomic,
            mintAddress: configuredMintAddress,
            mintDisplayName: recordMint.displayName,
            mintDecimals: recordMint.decimals,
            isTestMint: recordMint.isTestMint,
            mintNotice: recordMint.testnetNotice,
            optionalData: buildUmbraInvoiceOptionalData(invoice.publicId),
            latestPayment: invoice.latestUmbraPayment,
          }
        : null,
  };
}

export default async function PayPage({ params }: PayPageProps) {
  const { intentId } = await params;
  const invoice = await getCheckoutRecord(intentId);

  if (!invoice) {
    notFound();
  }

  const checkout = buildCheckoutViewModel(invoice);

  return <CheckoutQrPayment checkout={checkout} />;
}
