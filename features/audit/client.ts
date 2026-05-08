import {
  authenticatedFetch,
  createApiClientError,
  type GetAuthToken,
} from "@/features/auth/client";
import {
  base58ToBytes,
  bytesToBase58,
  encodeGrantTokenForUrl,
} from "@/features/audit/mappers";
import type {
  AuditorEvidenceResponse,
  GrantTokenPayload,
  IssueGrantInput,
  PersistIssuedGrantInput,
  SerializedComplianceGrant,
} from "@/features/audit/types";
import {
  issueAuditorGrant,
  revokeAuditorGrant,
  type DueVaultConfig,
} from "@/lib/umbra/sdk";

export type SdkGrant = Awaited<ReturnType<typeof issueAuditorGrant>>;

export function reconstructSdkGrant(grant: SerializedComplianceGrant): SdkGrant {
  return {
    signature: grant.issuanceSignature as unknown as SdkGrant["signature"],
    nonce: BigInt(grant.grantNonce) as unknown as SdkGrant["nonce"],
    granterAddress: grant.granterAddress,
    auditorAddress: grant.auditorAddress,
    granterX25519: base58ToBytes(grant.granterX25519Base58) as unknown as SdkGrant["granterX25519"],
    auditorX25519: base58ToBytes(grant.auditorX25519Base58) as unknown as SdkGrant["auditorX25519"],
  };
}

type GrantsListResponse = {
  grants?: SerializedComplianceGrant[];
  error?: string;
};

type IssuedGrantResponse = {
  grant?: SerializedComplianceGrant;
  token?: GrantTokenPayload;
  error?: string;
};

type EvidenceResponse = {
  evidence?: AuditorEvidenceResponse;
  error?: string;
  code?: string;
};

export async function listGrantsClient(getAuthToken: GetAuthToken) {
  const response = await authenticatedFetch(
    "/api/audit/grants",
    { cache: "no-store" },
    getAuthToken,
  );
  const payload = (await response.json()) as GrantsListResponse;

  if (!response.ok) {
    throw createApiClientError(
      response,
      "Unable to load compliance grants.",
      payload.error,
    );
  }

  return payload.grants ?? [];
}

async function persistIssuedGrant(
  body: PersistIssuedGrantInput,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    "/api/audit/grants",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as IssuedGrantResponse;

  if (!response.ok || !payload.grant || !payload.token) {
    throw createApiClientError(
      response,
      "Unable to persist compliance grant.",
      payload.error,
    );
  }

  return { grant: payload.grant, token: payload.token };
}

export async function issueAndPersistGrant(
  config: DueVaultConfig,
  input: IssueGrantInput & { granterAddress: string },
  getAuthToken: GetAuthToken,
) {
  const sdkGrant = await issueAuditorGrant(config, {
    granterAddress: input.granterAddress,
    auditorAddress: input.auditorAddress,
  });

  return persistIssuedGrant(
    {
      granterAddress: input.granterAddress,
      auditorAddress: input.auditorAddress,
      granterX25519Base58: bytesToBase58(sdkGrant.granterX25519),
      auditorX25519Base58: bytesToBase58(sdkGrant.auditorX25519),
      grantNonce: (sdkGrant.nonce as unknown as bigint).toString(),
      issuanceSignature: sdkGrant.signature as unknown as string,
      invoiceScopeIds: input.invoiceScopeIds ?? [],
      label: input.label ?? null,
    },
    getAuthToken,
  );
}

export async function revokeAndPersistGrant(
  config: DueVaultConfig,
  grant: SdkGrant,
  grantId: string,
  getAuthToken: GetAuthToken,
) {
  const revocationSignature = (await revokeAuditorGrant(
    config,
    grant,
  )) as unknown as string;

  const response = await authenticatedFetch(
    `/api/audit/grants/${encodeURIComponent(grantId)}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revocationSignature }),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as IssuedGrantResponse;

  if (!response.ok || !payload.grant) {
    throw createApiClientError(
      response,
      "Unable to revoke compliance grant.",
      payload.error,
    );
  }

  return payload.grant;
}

export async function fetchEvidenceForToken(args: {
  token: GrantTokenPayload;
  txSignature: string;
}) {
  const response = await fetch("/api/audit/decrypt-evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const payload = (await response.json()) as EvidenceResponse;

  if (!response.ok || !payload.evidence) {
    throw createApiClientError(
      response,
      "Unable to load evidence for this grant.",
      payload.error,
    );
  }

  return payload.evidence;
}

export function buildAuditorPortalUrl(
  origin: string,
  token: GrantTokenPayload,
): string {
  const encoded = encodeGrantTokenForUrl(token);
  return `${origin}/audit?token=${encoded}`;
}
