import { getBase58Decoder, getBase58Encoder } from "@solana/kit";

import type { ComplianceGrant } from "@/generated/prisma/client";
import type {
  GrantTokenPayload,
  SerializedComplianceGrant,
} from "@/features/audit/types";

const base58Decoder = getBase58Decoder();
const base58Encoder = getBase58Encoder();

export function bytesToBase58(bytes: Uint8Array): string {
  return base58Decoder.decode(bytes);
}

export function base58ToBytes(value: string): Uint8Array {
  return new Uint8Array(base58Encoder.encode(value));
}

export function serializeComplianceGrant(
  record: ComplianceGrant,
): SerializedComplianceGrant {
  const recordWithPaymentScope = record as ComplianceGrant & {
    paymentScopeSignatures?: string[];
  };

  return {
    id: record.id,
    merchantProfileId: record.merchantProfileId,
    granterAddress: record.granterAddress,
    auditorAddress: record.auditorAddress,
    granterX25519Base58: bytesToBase58(record.granterX25519),
    auditorX25519Base58: bytesToBase58(record.auditorX25519),
    grantNonce: record.grantNonce,
    issuanceSignature: record.issuanceSignature,
    invoiceScopeIds: record.invoiceScopeIds,
    paymentScopeSignatures: recordWithPaymentScope.paymentScopeSignatures ?? [],
    label: record.label,
    status: record.revokedAt ? "revoked" : "active",
    grantedAt: record.grantedAt.toISOString(),
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
    revocationSignature: record.revocationSignature,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function grantTokenPayloadFromSerialized(
  grant: SerializedComplianceGrant,
): GrantTokenPayload {
  return {
    v: 1,
    grantId: grant.id,
    granterAddress: grant.granterAddress,
    auditorAddress: grant.auditorAddress,
    granterX25519Base58: grant.granterX25519Base58,
    auditorX25519Base58: grant.auditorX25519Base58,
    grantNonce: grant.grantNonce,
    issuanceSignature: grant.issuanceSignature,
  };
}

export function encodeGrantTokenForUrl(token: GrantTokenPayload): string {
  const json = JSON.stringify(token);
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(json, "utf8").toString("base64")
      : btoa(json);

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeGrantTokenFromUrl(value: string): GrantTokenPayload {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  const base64 = padded + "=".repeat(padding);
  const json =
    typeof window === "undefined"
      ? Buffer.from(base64, "base64").toString("utf8")
      : atob(base64);

  return JSON.parse(json) as GrantTokenPayload;
}
