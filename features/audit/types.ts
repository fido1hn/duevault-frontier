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
};

export type PersistIssuedGrantInput = {
  granterAddress: string;
  auditorAddress: string;
  granterX25519Base58: string;
  auditorX25519Base58: string;
  grantNonce: string;
  issuanceSignature: string;
  invoiceScopeIds: string[];
  label: string | null;
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
    merchantBusinessName: string;
  };
};
