import "server-only";

import { formatUsdcValue, serializeInvoice } from "@/features/invoices/mappers";
import {
  createInvoiceRecord,
  findInvoiceRecordByNumber,
  invoiceRecordExists,
  listInvoiceRecords,
} from "@/features/invoices/repository";
import type { CreateInvoiceInput } from "@/features/invoices/types";
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

export async function listInvoices() {
  const invoices = await listInvoiceRecords();

  return invoices.map(serializeInvoice);
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  const invoice = await findInvoiceRecordByNumber(
    sanitizeInvoiceNumber(invoiceNumber),
  );

  return invoice ? serializeInvoice(invoice) : null;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const invoiceNumber = sanitizeInvoiceNumber(input.invoiceNumber);
  const customerName = sanitizeRequired(input.clientName, "Client name");
  const customerEmail = sanitizeEmail(input.clientEmail);
  const issuedAt = parseDate(input.issuedAt, "Issue date");
  const dueAt = parseDate(input.dueAt, "Due date");
  const status = input.status ?? "Sent";
  const paymentRail = input.paymentRail ?? "solana";
  const privacyRail = input.privacyRail ?? "umbra";
  const mint = input.mint ?? "USDC";
  const lineItems = buildLineItems(input.lineItems);
  const totalAmountAtomic = calculateTotalAtomic(lineItems);

  assertInvoiceStatus(status);
  assertPaymentRail(paymentRail);
  assertPrivacyRail(privacyRail);
  assertInvoiceMint(mint);

  if (await invoiceRecordExists(invoiceNumber)) {
    throw new Error("An invoice with this number already exists.");
  }

  const invoice = await createInvoiceRecord({
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
