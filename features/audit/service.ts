import "server-only";

import { db } from "@/server/db";
import {
  base58ToBytes,
  bytesToBase58,
  grantTokenPayloadFromSerialized,
  serializeComplianceGrant,
} from "@/features/audit/mappers";
import {
  createComplianceGrantRecord,
  findComplianceGrantById,
  findComplianceGrantByIdAndMerchant,
  listComplianceGrantsForMerchant,
  markComplianceGrantRevoked,
} from "@/features/audit/repository";
import type {
  AuditorEvidenceIndexItem,
  AuditorEvidenceResponse,
  GrantTokenPayload,
  PersistIssuedGrantInput,
  SerializedComplianceGrant,
} from "@/features/audit/types";

export class AuditServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "AuditServiceError";
    this.code = code;
    this.status = status;
  }
}

export type IssuedGrantResult = {
  grant: SerializedComplianceGrant;
  token: GrantTokenPayload;
};

function previewSignature(signature: string) {
  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
}

export async function persistIssuedGrantForMerchant(
  merchantProfileId: string,
  expectedGranterAddress: string,
  input: PersistIssuedGrantInput,
): Promise<IssuedGrantResult> {
  if (input.granterAddress !== expectedGranterAddress) {
    throw new AuditServiceError(
      "granterAddress does not match the merchant's Umbra wallet.",
      "granter_mismatch",
      403,
    );
  }

  const record = await createComplianceGrantRecord({
    merchantProfileId,
    granterAddress: input.granterAddress,
    auditorAddress: input.auditorAddress,
    granterX25519: base58ToBytes(input.granterX25519Base58),
    auditorX25519: base58ToBytes(input.auditorX25519Base58),
    grantNonce: input.grantNonce,
    issuanceSignature: input.issuanceSignature,
    invoiceScopeIds: input.invoiceScopeIds,
    paymentScopeSignatures: input.paymentScopeSignatures,
    label: input.label,
  });

  const grant = serializeComplianceGrant(record);

  return {
    grant,
    token: grantTokenPayloadFromSerialized(grant),
  };
}

export async function listGrantsForMerchant(
  merchantProfileId: string,
): Promise<SerializedComplianceGrant[]> {
  const records = await listComplianceGrantsForMerchant(merchantProfileId);
  return records.map(serializeComplianceGrant);
}

export async function markGrantRevokedForMerchant(
  merchantProfileId: string,
  grantId: string,
  revocationSignature: string,
): Promise<SerializedComplianceGrant> {
  const existing = await findComplianceGrantByIdAndMerchant(
    grantId,
    merchantProfileId,
  );

  if (!existing) {
    throw new AuditServiceError("Grant not found.", "grant_not_found", 404);
  }

  if (existing.revokedAt) {
    return serializeComplianceGrant(existing);
  }

  const updated = await markComplianceGrantRevoked(grantId, revocationSignature);
  return serializeComplianceGrant(updated);
}

function tokenMatchesGrant(
  token: GrantTokenPayload,
  grant: Awaited<ReturnType<typeof findComplianceGrantById>>,
): boolean {
  if (!grant) return false;
  return (
    token.granterAddress === grant.granterAddress &&
    token.auditorAddress === grant.auditorAddress &&
    token.grantNonce === grant.grantNonce &&
    token.issuanceSignature === grant.issuanceSignature &&
    token.granterX25519Base58 === bytesToBase58(grant.granterX25519) &&
    token.auditorX25519Base58 === bytesToBase58(grant.auditorX25519)
  );
}

export async function loadEvidenceForToken(
  token: GrantTokenPayload,
  txSignature: string,
): Promise<AuditorEvidenceResponse> {
  const grant = await findComplianceGrantById(token.grantId);

  if (!grant || !tokenMatchesGrant(token, grant)) {
    throw new AuditServiceError(
      "This grant token is malformed.",
      "grant_invalid",
      400,
    );
  }

  if (grant.revokedAt) {
    throw new AuditServiceError(
      "This grant has been revoked by the merchant.",
      "grant_revoked",
      403,
    );
  }

  const payment = await db.umbraInvoicePayment.findUnique({
    where: { createUtxoSignature: txSignature },
    include: {
      invoice: {
        include: {
          lineItems: { orderBy: { sortOrder: "asc" } },
        },
      },
      merchantProfile: true,
    },
  });

  if (!payment) {
    throw new AuditServiceError(
      "This transaction is outside the grant scope.",
      "payment_not_found",
      404,
    );
  }

  if (payment.merchantProfileId !== grant.merchantProfileId) {
    throw new AuditServiceError(
      "This transaction is outside the grant scope.",
      "payment_out_of_scope",
      403,
    );
  }

  const paymentScopeSignatures =
    (grant as typeof grant & { paymentScopeSignatures?: string[] })
      .paymentScopeSignatures ?? [];

  if (
    paymentScopeSignatures.length > 0 &&
    !paymentScopeSignatures.includes(payment.createUtxoSignature)
  ) {
    throw new AuditServiceError(
      "This transaction is outside the grant scope.",
      "payment_out_of_scope",
      403,
    );
  }

  if (
    paymentScopeSignatures.length === 0 &&
    grant.invoiceScopeIds.length > 0 &&
    !grant.invoiceScopeIds.includes(payment.invoiceId)
  ) {
    throw new AuditServiceError(
      "This transaction is outside the grant scope.",
      "invoice_out_of_scope",
      403,
    );
  }

  return {
    grant: {
      id: grant.id,
      label: grant.label,
      grantedAt: grant.grantedAt.toISOString(),
      granterAddress: grant.granterAddress,
      auditorAddress: grant.auditorAddress,
    },
    payment: {
      id: payment.id,
      createUtxoSignature: payment.createUtxoSignature,
      createProofAccountSignature: payment.createProofAccountSignature,
      payerWalletAddress: payment.payerWalletAddress,
      merchantUmbraWalletAddress: payment.merchantUmbraWalletAddress,
      network: payment.network as AuditorEvidenceResponse["payment"]["network"],
      mint: payment.mint,
      amountAtomic: payment.amountAtomic,
      status: payment.status as AuditorEvidenceResponse["payment"]["status"],
      confirmedAt: payment.confirmedAt ? payment.confirmedAt.toISOString() : null,
    },
    invoice: {
      invoiceNumber: payment.invoice.invoiceNumber,
      client: payment.invoice.customerName,
      clientEmail: payment.invoice.customerEmail,
      issuedAt: payment.invoice.issuedAt.toISOString(),
      dueAt: payment.invoice.dueAt.toISOString(),
      mint: payment.invoice
        .mint as AuditorEvidenceResponse["invoice"]["mint"],
      totalAmountAtomic: payment.invoice.totalAmountAtomic,
      notes: payment.invoice.notes,
      lineItems: payment.invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitAmountAtomic: item.unitAmountAtomic,
        totalAtomic: (
          BigInt(item.unitAmountAtomic) * BigInt(item.quantity)
        ).toString(),
      })),
      merchantBusinessName: payment.merchantProfile.businessName,
    },
  };
}

export async function loadEvidenceIndexForToken(
  token: GrantTokenPayload,
): Promise<AuditorEvidenceIndexItem[]> {
  const grant = await findComplianceGrantById(token.grantId);

  if (!grant || !tokenMatchesGrant(token, grant)) {
    throw new AuditServiceError(
      "This grant token is malformed.",
      "grant_invalid",
      400,
    );
  }

  if (grant.revokedAt) {
    throw new AuditServiceError(
      "This grant has been revoked by the merchant.",
      "grant_revoked",
      403,
    );
  }

  const paymentScopeSignatures =
    (grant as typeof grant & { paymentScopeSignatures?: string[] })
      .paymentScopeSignatures ?? [];
  const where =
    paymentScopeSignatures.length > 0
      ? {
          merchantProfileId: grant.merchantProfileId,
          status: "confirmed",
          createUtxoSignature: { in: paymentScopeSignatures },
        }
      : {
          merchantProfileId: grant.merchantProfileId,
          status: "confirmed",
          ...(grant.invoiceScopeIds.length > 0
            ? { invoiceId: { in: grant.invoiceScopeIds } }
            : {}),
        };

  const payments = await db.umbraInvoicePayment.findMany({
    where,
    include: {
      invoice: true,
    },
    orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
  });

  return payments.map((payment) => ({
    id: payment.id,
    invoiceId: payment.invoiceId,
    invoiceNumber: payment.invoice.invoiceNumber,
    client: payment.invoice.customerName,
    clientEmail: payment.invoice.customerEmail,
    issuedAt: payment.invoice.issuedAt.toISOString(),
    dueAt: payment.invoice.dueAt.toISOString(),
    totalAmountAtomic: payment.invoice.totalAmountAtomic,
    amountAtomic: payment.amountAtomic,
    mint: payment.mint,
    network: payment.network as AuditorEvidenceIndexItem["network"],
    status: payment.status as AuditorEvidenceIndexItem["status"],
    confirmedAt: payment.confirmedAt ? payment.confirmedAt.toISOString() : null,
    createUtxoSignature: payment.createUtxoSignature,
    createUtxoSignaturePreview: previewSignature(payment.createUtxoSignature),
  }));
}
