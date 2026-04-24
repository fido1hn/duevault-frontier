import "server-only";

import { formatUsdcValue, serializeInvoice } from "@/features/invoices/mappers";
import {
  createInvoiceRecord,
  findInvoiceRecordByNumber,
  findInvoiceRecordByPublicId,
  invoiceRecordExists,
  listInvoiceRecords,
} from "@/features/invoices/repository";
import { findMerchantProfileById } from "@/features/merchant-profiles/repository";
import {
  resolvePaymentMintForNetwork,
} from "@/features/payments/mints";
import type { CreateInvoiceInput } from "@/features/invoices/types";
import {
  getUmbraCheckoutMint,
  getUmbraRuntimeNetwork,
} from "@/lib/umbra/config";
import {
  assertInvoiceMint,
  assertInvoiceStatus,
  assertPaymentRail,
  assertPrivacyRail,
  buildLineItems,
  calculateTotalAtomic,
  parseDate,
  sanitizeEmail,
  sanitizeInvoiceNumber,
  sanitizeRequired,
} from "@/features/invoices/validators";

export function formatUsdc(value: number) {
  return formatUsdcValue(value);
}

export async function listInvoices(merchantProfileId: string) {
  const invoices = await listInvoiceRecords(merchantProfileId);

  return invoices.map(serializeInvoice);
}

export async function getInvoiceByNumber(
  merchantProfileId: string,
  invoiceNumber: string,
) {
  const invoice = await findInvoiceRecordByNumber(
    merchantProfileId,
    sanitizeInvoiceNumber(invoiceNumber),
  );

  return invoice ? serializeInvoice(invoice) : null;
}

export async function getInvoiceByPublicId(publicId: string) {
  const invoice = await findInvoiceRecordByPublicId(
    sanitizeRequired(publicId, "Invoice ID"),
  );

  return invoice ? serializeInvoice(invoice) : null;
}

export async function createInvoice(
  merchantProfileId: string,
  input: CreateInvoiceInput,
) {
  const invoiceNumber = sanitizeInvoiceNumber(input.invoiceNumber);
  const customerName = sanitizeRequired(input.clientName, "Client name");
  const customerEmail = sanitizeEmail(input.clientEmail);
  const issuedAt = parseDate(input.issuedAt, "Issue date");
  const dueAt = parseDate(input.dueAt, "Due date");
  const status = input.status ?? "Sent";
  const paymentRail = input.paymentRail ?? "solana";
  const privacyRail = input.privacyRail ?? "umbra";
  const network = getUmbraRuntimeNetwork();
  const mint = input.mint ?? getUmbraCheckoutMint().id;

  assertInvoiceStatus(status);
  assertPaymentRail(paymentRail);
  assertPrivacyRail(privacyRail);
  assertInvoiceMint(mint);

  const lineItems = buildLineItems(input.lineItems, mint);
  const totalAmountAtomic = calculateTotalAtomic(lineItems);

  if (privacyRail === "umbra") {
    const merchantProfile = await findMerchantProfileById(merchantProfileId);

    if (!merchantProfile) {
      throw new Error("Merchant profile not found.");
    }

    if (
      merchantProfile.umbraStatus !== "ready" ||
      merchantProfile.umbraWalletAddress !== merchantProfile.primaryWallet.address
    ) {
      throw new Error(
        "Set up Umbra for your merchant wallet before creating an Umbra invoice.",
      );
    }

    if (merchantProfile.umbraNetwork !== network) {
      throw new Error(
        `Merchant Umbra setup is for ${merchantProfile.umbraNetwork}, but checkout is configured for ${network}.`,
      );
    }

    resolvePaymentMintForNetwork(mint, merchantProfile.umbraNetwork);
  }

  if (await invoiceRecordExists(merchantProfileId, invoiceNumber)) {
    throw new Error("An invoice with this number already exists.");
  }

  const invoice = await createInvoiceRecord({
    merchantProfileId,
    invoiceNumber,
    customerName,
    customerEmail,
    status,
    issuedAt,
    dueAt,
    notes: input.notes?.trim() ?? "",
    paymentRail,
    privacyRail,
    mint,
    totalAmountAtomic,
    lineItems,
  });

  return serializeInvoice(invoice);
}
