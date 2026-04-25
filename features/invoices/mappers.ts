import type { InvoiceRecord } from "@/features/invoices/repository";
import type {
  PublicUmbraPaymentStatus,
  SerializedInvoice,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";
import {
  assertInvoiceMint,
  assertInvoiceStatus,
  assertPaymentRail,
  assertPrivacyRail,
  atomicToNumber,
} from "@/features/invoices/validators";
import {
  assertUmbraNetwork,
  assertUmbraRegistrationStatus,
} from "@/features/merchant-profiles/validators";
import {
  getPaymentMintDecimals,
  getPaymentMintDisplayName,
} from "@/features/payments/mints";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function formatUsdcValue(value: number) {
  return amountFormatter.format(value);
}

export function formatPaymentMintValue(
  value: number,
  mint: SerializedInvoice["mint"],
) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: getPaymentMintDecimals(mint),
  }).format(value);
}

function assertUmbraInvoicePaymentStatus(
  value: string,
): asserts value is SerializedUmbraInvoicePayment["status"] {
  if (value !== "confirmed" && value !== "failed" && value !== "submitted") {
    throw new Error("Invalid Umbra invoice payment status.");
  }
}

export function serializeUmbraInvoicePayment(
  payment: InvoiceRecord["umbraPayments"][number],
): SerializedUmbraInvoicePayment {
  assertUmbraNetwork(payment.network);
  assertUmbraInvoicePaymentStatus(payment.status);

  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    merchantProfileId: payment.merchantProfileId,
    payerWalletAddress: payment.payerWalletAddress,
    merchantUmbraWalletAddress: payment.merchantUmbraWalletAddress,
    network: payment.network,
    mint: payment.mint,
    amountAtomic: payment.amountAtomic,
    status: payment.status,
    optionalData: payment.optionalData,
    closeProofAccountSignature: payment.closeProofAccountSignature,
    createProofAccountSignature: payment.createProofAccountSignature,
    createUtxoSignature: payment.createUtxoSignature,
    error: payment.error,
    claimableH1Hash: payment.claimableH1Hash,
    claimableH2Hash: payment.claimableH2Hash,
    claimableTreeIndex: payment.claimableTreeIndex,
    claimableInsertionIndex: payment.claimableInsertionIndex,
    claimedAt: payment.claimedAt?.toISOString() ?? null,
    claimResult: payment.claimResult ?? null,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function previewSignature(signature: string) {
  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
}

export function serializePublicUmbraPaymentStatus(
  payment:
    | InvoiceRecord["umbraPayments"][number]
    | SerializedUmbraInvoicePayment
    | null
    | undefined,
): PublicUmbraPaymentStatus | null {
  if (!payment) {
    return null;
  }

  assertUmbraInvoicePaymentStatus(payment.status);

  const confirmedAt =
    payment.confirmedAt instanceof Date
      ? payment.confirmedAt.toISOString()
      : payment.confirmedAt;

  return {
    status: payment.status,
    confirmedAt,
    createUtxoSignaturePreview: previewSignature(payment.createUtxoSignature),
  };
}

export function serializeInvoice(invoice: InvoiceRecord): SerializedInvoice {
  assertInvoiceStatus(invoice.status);
  assertPaymentRail(invoice.paymentRail);
  assertPrivacyRail(invoice.privacyRail);
  assertInvoiceMint(invoice.mint);
  assertUmbraNetwork(invoice.merchantProfile.umbraNetwork);
  assertUmbraRegistrationStatus(invoice.merchantProfile.umbraStatus);

  const mint = invoice.mint;
  const amountNumber = atomicToNumber(invoice.totalAmountAtomic, mint);

  return {
    id: invoice.invoiceNumber,
    invoiceId: invoice.id,
    publicId: invoice.publicId,
    merchantProfileId: invoice.merchantProfileId,
    merchantName: invoice.merchantProfile.businessName,
    merchantWalletAddress: invoice.merchantProfile.primaryWallet.address,
    merchantUmbraNetwork: invoice.merchantProfile.umbraNetwork,
    merchantUmbraStatus: invoice.merchantProfile.umbraStatus,
    merchantUmbraWalletAddress: invoice.merchantProfile.umbraWalletAddress,
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.customerName,
    clientEmail: invoice.customerEmail,
    issued: shortDateFormatter.format(invoice.issuedAt),
    due: shortDateFormatter.format(invoice.dueAt),
    dueLong: longDateFormatter.format(invoice.dueAt),
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt.toISOString(),
    amount: `${formatPaymentMintValue(
      amountNumber,
      mint,
    )} ${getPaymentMintDisplayName(mint)}`,
    amountNumber,
    amountAtomic: invoice.totalAmountAtomic,
    status: invoice.status,
    notes: invoice.notes,
    paymentRail: invoice.paymentRail,
    privacyRail: invoice.privacyRail,
    mint,
    lineItems: invoice.lineItems.map((item) => {
      const price = atomicToNumber(item.unitAmountAtomic, mint);
      const totalAtomic = (
        BigInt(item.unitAmountAtomic) * BigInt(item.quantity)
      ).toString();
      const total = atomicToNumber(totalAtomic, mint);

      return {
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price,
        priceAtomic: item.unitAmountAtomic,
        priceDisplay: formatPaymentMintValue(price, mint),
        total,
        totalAtomic,
        totalDisplay: formatPaymentMintValue(total, mint),
        sortOrder: item.sortOrder,
      };
    }),
    latestUmbraPayment: invoice.umbraPayments[0]
      ? serializeUmbraInvoicePayment(invoice.umbraPayments[0])
      : null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
