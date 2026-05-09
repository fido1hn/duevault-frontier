import "server-only";

import { db } from "@/server/db";

export type CreateComplianceGrantInput = {
  merchantProfileId: string;
  granterAddress: string;
  auditorAddress: string;
  granterX25519: Uint8Array;
  auditorX25519: Uint8Array;
  grantNonce: string;
  issuanceSignature: string;
  invoiceScopeIds: string[];
  paymentScopeSignatures: string[];
  label: string | null;
};

export async function createComplianceGrantRecord(
  input: CreateComplianceGrantInput,
) {
  return db.complianceGrant.create({
    data: {
      merchantProfileId: input.merchantProfileId,
      granterAddress: input.granterAddress,
      auditorAddress: input.auditorAddress,
      granterX25519: Buffer.from(input.granterX25519),
      auditorX25519: Buffer.from(input.auditorX25519),
      grantNonce: input.grantNonce,
      issuanceSignature: input.issuanceSignature,
      invoiceScopeIds: input.invoiceScopeIds,
      paymentScopeSignatures: input.paymentScopeSignatures,
      label: input.label,
    },
  });
}

export async function findComplianceGrantById(grantId: string) {
  return db.complianceGrant.findUnique({
    where: { id: grantId },
  });
}

export async function findComplianceGrantByIdAndMerchant(
  grantId: string,
  merchantProfileId: string,
) {
  return db.complianceGrant.findFirst({
    where: { id: grantId, merchantProfileId },
  });
}

export async function listComplianceGrantsForMerchant(merchantProfileId: string) {
  return db.complianceGrant.findMany({
    where: { merchantProfileId },
    orderBy: { grantedAt: "desc" },
  });
}

export async function markComplianceGrantRevoked(
  grantId: string,
  revocationSignature: string,
) {
  return db.complianceGrant.update({
    where: { id: grantId },
    data: {
      revokedAt: new Date(),
      revocationSignature,
    },
  });
}
