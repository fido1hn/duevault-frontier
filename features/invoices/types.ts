import type {
  INVOICE_MINTS,
  INVOICE_STATUSES,
  PAYMENT_RAILS,
  PRIVACY_RAILS,
} from "@/features/invoices/constants";
import type {
  UmbraNetwork,
  UmbraRegistrationStatus,
} from "@/features/merchant-profiles/types";

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

export type SerializedUmbraInvoicePayment = {
  id: string;
  invoiceId: string;
  merchantProfileId: string;
  payerWalletAddress: string;
  merchantUmbraWalletAddress: string;
  network: UmbraNetwork;
  mint: string;
  amountAtomic: string;
  status: "confirmed" | "failed" | "submitted";
  optionalData: string;
  closeProofAccountSignature: string | null;
  createProofAccountSignature: string;
  createUtxoSignature: string;
  error: string | null;
  claimableH1Hash: string | null;
  claimableH2Hash: string | null;
  claimableTreeIndex: string | null;
  claimableInsertionIndex: string | null;
  claimedAt: string | null;
  claimResult: unknown | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicUmbraPaymentStatus = {
  status: SerializedUmbraInvoicePayment["status"];
  confirmedAt: string | null;
  createUtxoSignaturePreview: string | null;
};

export type SerializedInvoice = {
  id: string;
  invoiceId: string;
  publicId: string;
  merchantProfileId: string;
  merchantName: string;
  merchantWalletAddress: string;
  merchantUmbraNetwork: UmbraNetwork;
  merchantUmbraStatus: UmbraRegistrationStatus;
  merchantUmbraWalletAddress: string | null;
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
  latestUmbraPayment: SerializedUmbraInvoicePayment | null;
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

export type ConfirmUmbraInvoicePaymentInput = {
  createUtxoSignature: string;
  destinationAddress: string;
  payerWalletAddress: string;
  mint: string;
  amountAtomic: string;
  h1Hash: string;
  h2Hash: string;
  treeIndex: string;
  insertionIndex: string;
};

export type ClaimUmbraInvoicePaymentInput = {
  createUtxoSignature: string;
  claimResult: unknown;
};

export type InvoiceLineItemCreateData = {
  description: string;
  quantity: number;
  unitAmountAtomic: string;
  sortOrder: number;
};
