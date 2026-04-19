import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  InvoiceLineItemCreateData,
  InvoiceMint,
  InvoiceStatus,
  PaymentRail,
  PrivacyRail,
} from "@/features/invoices/types";

const invoiceInclude = {
  lineItems: {
    orderBy: {
      sortOrder: "asc",
    },
  },
} satisfies Prisma.InvoiceInclude;

export type InvoiceRecord = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

export type CreateInvoiceRecordInput = {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  status: InvoiceStatus;
  issuedAt: Date;
  dueAt: Date;
  notes: string;
  paymentRail: PaymentRail;
  privacyRail: PrivacyRail;
  mint: InvoiceMint;
  totalAmountAtomic: string;
  lineItems: InvoiceLineItemCreateData[];
};

export async function listInvoiceRecords() {
  return db.invoice.findMany({
    include: invoiceInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findInvoiceRecordByNumber(invoiceNumber: string) {
  return db.invoice.findUnique({
    where: {
      invoiceNumber,
    },
    include: invoiceInclude,
  });
}

export async function invoiceRecordExists(invoiceNumber: string) {
  const invoice = await db.invoice.findUnique({
    where: {
      invoiceNumber,
    },
    select: {
      id: true,
    },
  });

  return Boolean(invoice);
}

export async function createInvoiceRecord(input: CreateInvoiceRecordInput) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        email: input.customerEmail,
      },
      update: {
        name: input.customerName,
      },
      create: {
        name: input.customerName,
        email: input.customerEmail,
      },
    });

    return tx.invoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        customerId: customer.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status: input.status,
        issuedAt: input.issuedAt,
        dueAt: input.dueAt,
        notes: input.notes,
        paymentRail: input.paymentRail,
        privacyRail: input.privacyRail,
        mint: input.mint,
        totalAmountAtomic: input.totalAmountAtomic,
        lineItems: {
          create: input.lineItems,
        },
      },
      include: invoiceInclude,
    });
  });
}
