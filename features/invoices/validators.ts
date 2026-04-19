import {
  INVOICE_MINTS,
  INVOICE_STATUSES,
  PAYMENT_RAILS,
  PRIVACY_RAILS,
} from "@/features/invoices/constants";
import type {
  CreateInvoiceInput,
  InvoiceLineItemCreateData,
  InvoiceMint,
  InvoiceStatus,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

const ATOMIC_DECIMALS = 6n;
const ATOMIC_FACTOR = 10n ** ATOMIC_DECIMALS;

export function assertInvoiceStatus(value: string): asserts value is InvoiceStatus {
  if (!INVOICE_STATUSES.includes(value as InvoiceStatus)) {
    throw new Error("Invalid invoice status.");
  }
}

export function assertPaymentRail(value: string): asserts value is PaymentRail {
  if (!PAYMENT_RAILS.includes(value as PaymentRail)) {
    throw new Error("Invalid payment rail.");
  }
}

export function assertPrivacyRail(value: string): asserts value is PrivacyRail {
  if (!PRIVACY_RAILS.includes(value as PrivacyRail)) {
    throw new Error("Invalid privacy rail.");
  }
}

export function assertInvoiceMint(value: string): asserts value is InvoiceMint {
  if (!INVOICE_MINTS.includes(value as InvoiceMint)) {
    throw new Error("Invalid invoice mint.");
  }
}

export function sanitizeRequired(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

export function sanitizeInvoiceNumber(value: string) {
  const normalized = sanitizeRequired(value, "Invoice number").toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9-_]{1,31}$/.test(normalized)) {
    throw new Error("Invoice number must be 2-32 letters, numbers, dashes, or underscores.");
  }

  return normalized;
}

export function sanitizeEmail(value: string) {
  const normalized = sanitizeRequired(value, "Client email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Client email must be a valid email address.");
  }

  return normalized;
}

export function parseDate(value: string, label: string) {
  const normalized = sanitizeRequired(value, label);
  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

export function parseUsdcToAtomic(value: number | string) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error("Line item price must be a positive USDC amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const atomic =
    BigInt(whole) * ATOMIC_FACTOR +
    BigInt(fraction.padEnd(Number(ATOMIC_DECIMALS), "0"));

  if (atomic <= 0n) {
    throw new Error("Line item price must be greater than zero.");
  }

  return atomic.toString();
}

export function atomicToNumber(value: string) {
  return Number(value) / Number(ATOMIC_FACTOR);
}

export function buildLineItems(
  input: CreateInvoiceInput["lineItems"],
): InvoiceLineItemCreateData[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("At least one line item is required.");
  }

  return input.map((item, index) => {
    const description = sanitizeRequired(
      item.description,
      `Line item ${index + 1} description`,
    );
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Line item ${index + 1} quantity must be a positive integer.`);
    }

    return {
      description,
      quantity,
      unitAmountAtomic: parseUsdcToAtomic(item.price),
      sortOrder: index,
    };
  });
}

export function calculateTotalAtomic(
  lineItems: { quantity: number; unitAmountAtomic: string }[],
) {
  return lineItems
    .reduce((sum, item) => {
      return sum + BigInt(item.unitAmountAtomic) * BigInt(item.quantity);
    }, 0n)
    .toString();
}
