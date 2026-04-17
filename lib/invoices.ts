import { db } from "@/lib/db";
import {
  INVOICE_MINTS,
  INVOICE_STATUSES,
  PAYMENT_RAILS,
  PRIVACY_RAILS,
  type CreateInvoiceInput,
  type InvoiceMint,
  type InvoiceStatus,
  type PaymentRail,
  type PrivacyRail,
  type SerializedInvoice,
} from "@/lib/invoice-types";

const ATOMIC_DECIMALS = 6n;
const ATOMIC_FACTOR = 10n ** ATOMIC_DECIMALS;

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

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  notes: string;
  paymentRail: string;
  privacyRail: string;
  mint: string;
  totalAmountAtomic: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    unitAmountAtomic: string;
    sortOrder: number;
  }[];
};

function assertInvoiceStatus(value: string): asserts value is InvoiceStatus {
  if (!INVOICE_STATUSES.includes(value as InvoiceStatus)) {
    throw new Error("Invalid invoice status.");
  }
}

function assertPaymentRail(value: string): asserts value is PaymentRail {
  if (!PAYMENT_RAILS.includes(value as PaymentRail)) {
    throw new Error("Invalid payment rail.");
  }
}

function assertPrivacyRail(value: string): asserts value is PrivacyRail {
  if (!PRIVACY_RAILS.includes(value as PrivacyRail)) {
    throw new Error("Invalid privacy rail.");
  }
}

function assertInvoiceMint(value: string): asserts value is InvoiceMint {
  if (!INVOICE_MINTS.includes(value as InvoiceMint)) {
    throw new Error("Invalid invoice mint.");
  }
}

function sanitizeRequired(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function sanitizeInvoiceNumber(value: string) {
  const normalized = sanitizeRequired(value, "Invoice number").toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9-_]{1,31}$/.test(normalized)) {
    throw new Error("Invoice number must be 2-32 letters, numbers, dashes, or underscores.");
  }

  return normalized;
}

function sanitizeEmail(value: string) {
  const normalized = sanitizeRequired(value, "Client email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Client email must be a valid email address.");
  }

  return normalized;
}

function parseDate(value: string, label: string) {
  const normalized = sanitizeRequired(value, label);
  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function parseUsdcToAtomic(value: number | string) {
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

function atomicToNumber(value: string) {
  return Number(value) / Number(ATOMIC_FACTOR);
}

function formatUsdcValue(value: number) {
  return amountFormatter.format(value);
}

function formatAtomicUsdc(value: string) {
  return formatUsdcValue(atomicToNumber(value));
}

function buildLineItems(input: CreateInvoiceInput["lineItems"]) {
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

function calculateTotalAtomic(
  lineItems: { quantity: number; unitAmountAtomic: string }[],
) {
  return lineItems
    .reduce((sum, item) => {
      return sum + BigInt(item.unitAmountAtomic) * BigInt(item.quantity);
    }, 0n)
    .toString();
}

function serializeInvoice(invoice: InvoiceRecord): SerializedInvoice {
  assertInvoiceStatus(invoice.status);
  assertPaymentRail(invoice.paymentRail);
  assertPrivacyRail(invoice.privacyRail);
  assertInvoiceMint(invoice.mint);

  const amountNumber = atomicToNumber(invoice.totalAmountAtomic);

  return {
    id: invoice.invoiceNumber,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.customerName,
    clientEmail: invoice.customerEmail,
    issued: shortDateFormatter.format(invoice.issuedAt),
    due: shortDateFormatter.format(invoice.dueAt),
    dueLong: longDateFormatter.format(invoice.dueAt),
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt.toISOString(),
    amount: `${formatUsdcValue(amountNumber)} ${invoice.mint}`,
    amountNumber,
    amountAtomic: invoice.totalAmountAtomic,
    status: invoice.status,
    notes: invoice.notes,
    paymentRail: invoice.paymentRail,
    privacyRail: invoice.privacyRail,
    mint: invoice.mint,
    lineItems: invoice.lineItems.map((item) => {
      const price = atomicToNumber(item.unitAmountAtomic);
      const totalAtomic = (
        BigInt(item.unitAmountAtomic) * BigInt(item.quantity)
      ).toString();
      const total = atomicToNumber(totalAtomic);

      return {
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price,
        priceAtomic: item.unitAmountAtomic,
        priceDisplay: formatUsdcValue(price),
        total,
        totalAtomic,
        totalDisplay: formatUsdcValue(total),
        sortOrder: item.sortOrder,
      };
    }),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function formatUsdc(value: number) {
  return formatUsdcValue(value);
}

export async function listInvoices() {
  const invoices = await db.invoice.findMany({
    include: {
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invoices.map(serializeInvoice);
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  const invoice = await db.invoice.findUnique({
    where: {
      invoiceNumber: sanitizeInvoiceNumber(invoiceNumber),
    },
    include: {
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

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

  const existingInvoice = await db.invoice.findUnique({
    where: {
      invoiceNumber,
    },
  });

  if (existingInvoice) {
    throw new Error("An invoice with this number already exists.");
  }

  const invoice = await db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        email: customerEmail,
      },
      update: {
        name: customerName,
      },
      create: {
        name: customerName,
        email: customerEmail,
      },
    });

    return tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
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
        lineItems: {
          create: lineItems,
        },
      },
      include: {
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  });

  return serializeInvoice(invoice);
}
