import type {
  INVOICE_MINTS,
  INVOICE_STATUSES,
  PAYMENT_RAILS,
  PRIVACY_RAILS,
} from "@/features/invoices/constants";

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentRail = (typeof PAYMENT_RAILS)[number];
export type PrivacyRail = (typeof PRIVACY_RAILS)[number];
export type InvoiceMint = (typeof INVOICE_MINTS)[number];

export type SerializedInvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  priceAtomic: string;
  priceDisplay: string;
  total: number;
  totalAtomic: string;
  totalDisplay: string;
  sortOrder: number;
};

export type SerializedInvoice = {
  id: string;
  invoiceId: string;
  publicId: string;
  merchantProfileId: string;
  merchantName: string;
  merchantWalletAddress: string;
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  issued: string;
  due: string;
  dueLong: string;
  issuedAt: string;
  dueAt: string;
  amount: string;
  amountNumber: number;
  amountAtomic: string;
  status: InvoiceStatus;
  notes: string;
  paymentRail: PaymentRail;
  privacyRail: PrivacyRail;
  mint: InvoiceMint;
  lineItems: SerializedInvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateInvoiceLineItemInput = {
  description: string;
  quantity: number;
  price: number | string;
};

export type CreateInvoiceInput = {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  issuedAt: string;
  dueAt: string;
  notes?: string;
  paymentRail?: PaymentRail;
  privacyRail?: PrivacyRail;
  mint?: InvoiceMint;
  status?: InvoiceStatus;
  lineItems: CreateInvoiceLineItemInput[];
};

export type InvoiceLineItemCreateData = {
  description: string;
  quantity: number;
  unitAmountAtomic: string;
  sortOrder: number;
};
