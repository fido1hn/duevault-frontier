import type {
  SerializedInvoice,
  SerializedUmbraInvoicePayment,
} from "@/features/invoices/types";

export type ComplianceGrantStatus = "active" | "revoked";

export type SerializedComplianceGrant = {
  id: string;
  merchantProfileId: string;
  granterAddress: string;
  auditorAddress: string;
  granterX25519Base58: string;
  auditorX25519Base58: string;
  grantNonce: string;
  issuanceSignature: string;
  invoiceScopeIds: string[];
  paymentScopeSignatures: string[];
  label: string | null;
  status: ComplianceGrantStatus;
  grantedAt: string;
  revokedAt: string | null;
  revocationSignature: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GrantTokenPayload = {
  v: 1;
  grantId: string;
  granterAddress: string;
  auditorAddress: string;
  granterX25519Base58: string;
  auditorX25519Base58: string;
  grantNonce: string;
  issuanceSignature: string;
};

export type IssueGrantInput = {
  auditorAddress: string;
  label?: string | null;
  invoiceScopeIds?: string[];
  paymentScopeSignatures?: string[];
};

export type PersistIssuedGrantInput = {
  granterAddress: string;
  auditorAddress: string;
  granterX25519Base58: string;
  auditorX25519Base58: string;
  grantNonce: string;
  issuanceSignature: string;
  invoiceScopeIds: string[];
  paymentScopeSignatures: string[];
  label: string | null;
};

export type AuditorEvidenceIndexItem = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  issuedAt: string;
  dueAt: string;
  totalAmountAtomic: string;
  amountAtomic: string;
  mint: string;
  network: SerializedUmbraInvoicePayment["network"];
  status: SerializedUmbraInvoicePayment["status"];
  confirmedAt: string | null;
  createUtxoSignature: string;
  createUtxoSignaturePreview: string;
};

export type AuditorInvoiceLineItem = {
  description: string;
  quantity: number;
  unitAmountAtomic: string;
  totalAtomic: string;
};

export type AuditorEvidenceResponse = {
  grant: {
    id: string;
    label: string | null;
    grantedAt: string;
    granterAddress: string;
    auditorAddress: string;
  };
  payment: Pick<
    SerializedUmbraInvoicePayment,
    | "id"
    | "createUtxoSignature"
    | "createProofAccountSignature"
    | "payerWalletAddress"
    | "merchantUmbraWalletAddress"
    | "network"
    | "mint"
    | "amountAtomic"
    | "status"
    | "confirmedAt"
  >;
  invoice: Pick<
    SerializedInvoice,
    "invoiceNumber" | "client" | "clientEmail" | "issuedAt" | "dueAt" | "mint"
  > & {
    totalAmountAtomic: string;
    notes: string;
    lineItems: AuditorInvoiceLineItem[];
    merchantBusinessName: string;
  };
};
