import { base58ToBytes } from "@/features/audit/mappers";
import type {
  GrantTokenPayload,
  IssueGrantInput,
  PersistIssuedGrantInput,
} from "@/features/audit/types";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const X25519_KEY_BYTE_LENGTH = 32;
const NONCE_REGEX = /^\d+$/;

export class AuditValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuditValidationError";
    this.status = status;
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AuditValidationError(`${field} is required.`);
  }
}

function assertSolanaAddress(value: string, field: string) {
  if (!SOLANA_ADDRESS_REGEX.test(value)) {
    throw new AuditValidationError(`${field} is not a valid Solana address.`);
  }
}

function assertX25519Base58(value: string, field: string) {
  let bytes: Uint8Array;
  try {
    bytes = base58ToBytes(value);
  } catch {
    throw new AuditValidationError(`${field} is not valid base58.`);
  }

  if (bytes.length !== X25519_KEY_BYTE_LENGTH) {
    throw new AuditValidationError(
      `${field} must decode to ${X25519_KEY_BYTE_LENGTH} bytes.`,
    );
  }
}

function assertNonceString(value: string, field: string) {
  if (!NONCE_REGEX.test(value)) {
    throw new AuditValidationError(`${field} must be a positive integer string.`);
  }
}

export function parseGrantTokenPayload(value: unknown): GrantTokenPayload {
  if (!value || typeof value !== "object") {
    throw new AuditValidationError("Grant token payload is missing.");
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.v !== 1) {
    throw new AuditValidationError("Unsupported grant token version.");
  }

  assertString(candidate.grantId, "grantId");
  assertString(candidate.granterAddress, "granterAddress");
  assertSolanaAddress(candidate.granterAddress, "granterAddress");
  assertString(candidate.auditorAddress, "auditorAddress");
  assertSolanaAddress(candidate.auditorAddress, "auditorAddress");
  assertString(candidate.granterX25519Base58, "granterX25519Base58");
  assertX25519Base58(candidate.granterX25519Base58, "granterX25519Base58");
  assertString(candidate.auditorX25519Base58, "auditorX25519Base58");
  assertX25519Base58(candidate.auditorX25519Base58, "auditorX25519Base58");
  assertString(candidate.grantNonce, "grantNonce");
  assertNonceString(candidate.grantNonce, "grantNonce");
  assertString(candidate.issuanceSignature, "issuanceSignature");

  return {
    v: 1,
    grantId: candidate.grantId,
    granterAddress: candidate.granterAddress,
    auditorAddress: candidate.auditorAddress,
    granterX25519Base58: candidate.granterX25519Base58,
    auditorX25519Base58: candidate.auditorX25519Base58,
    grantNonce: candidate.grantNonce,
    issuanceSignature: candidate.issuanceSignature,
  };
}

export function parseIssueGrantInput(value: unknown): IssueGrantInput {
  if (!value || typeof value !== "object") {
    throw new AuditValidationError("Request body is required.");
  }

  const candidate = value as Record<string, unknown>;

  assertString(candidate.auditorAddress, "auditorAddress");
  assertSolanaAddress(candidate.auditorAddress, "auditorAddress");

  let label: string | null = null;
  if (candidate.label !== undefined && candidate.label !== null) {
    if (typeof candidate.label !== "string") {
      throw new AuditValidationError("label must be a string.");
    }
    const trimmed = candidate.label.trim();
    if (trimmed.length > 120) {
      throw new AuditValidationError("label is too long (max 120 characters).");
    }
    label = trimmed.length > 0 ? trimmed : null;
  }

  let invoiceScopeIds: string[] = [];
  if (candidate.invoiceScopeIds !== undefined) {
    if (!Array.isArray(candidate.invoiceScopeIds)) {
      throw new AuditValidationError("invoiceScopeIds must be an array.");
    }
    invoiceScopeIds = candidate.invoiceScopeIds.map((entry, index) => {
      if (typeof entry !== "string" || entry.length === 0) {
        throw new AuditValidationError(
          `invoiceScopeIds[${index}] must be a non-empty string.`,
        );
      }
      return entry;
    });
  }

  return {
    auditorAddress: candidate.auditorAddress,
    label,
    invoiceScopeIds,
  };
}

export function parseTxSignature(value: unknown): string {
  assertString(value, "txSignature");
  if (!TX_SIGNATURE_REGEX.test(value)) {
    throw new AuditValidationError("txSignature is not valid base58.");
  }
  return value;
}

export function parsePersistIssuedGrantInput(
  value: unknown,
): PersistIssuedGrantInput {
  if (!value || typeof value !== "object") {
    throw new AuditValidationError("Request body is required.");
  }

  const candidate = value as Record<string, unknown>;

  assertString(candidate.granterAddress, "granterAddress");
  assertSolanaAddress(candidate.granterAddress, "granterAddress");
  assertString(candidate.auditorAddress, "auditorAddress");
  assertSolanaAddress(candidate.auditorAddress, "auditorAddress");
  assertString(candidate.granterX25519Base58, "granterX25519Base58");
  assertX25519Base58(candidate.granterX25519Base58, "granterX25519Base58");
  assertString(candidate.auditorX25519Base58, "auditorX25519Base58");
  assertX25519Base58(candidate.auditorX25519Base58, "auditorX25519Base58");
  assertString(candidate.grantNonce, "grantNonce");
  assertNonceString(candidate.grantNonce, "grantNonce");
  assertString(candidate.issuanceSignature, "issuanceSignature");
  if (!TX_SIGNATURE_REGEX.test(candidate.issuanceSignature)) {
    throw new AuditValidationError("issuanceSignature is not valid base58.");
  }

  let label: string | null = null;
  if (candidate.label !== undefined && candidate.label !== null) {
    if (typeof candidate.label !== "string") {
      throw new AuditValidationError("label must be a string.");
    }
    const trimmed = candidate.label.trim();
    if (trimmed.length > 120) {
      throw new AuditValidationError("label is too long (max 120 characters).");
    }
    label = trimmed.length > 0 ? trimmed : null;
  }

  let invoiceScopeIds: string[] = [];
  if (candidate.invoiceScopeIds !== undefined) {
    if (!Array.isArray(candidate.invoiceScopeIds)) {
      throw new AuditValidationError("invoiceScopeIds must be an array.");
    }
    invoiceScopeIds = candidate.invoiceScopeIds.map((entry, index) => {
      if (typeof entry !== "string" || entry.length === 0) {
        throw new AuditValidationError(
          `invoiceScopeIds[${index}] must be a non-empty string.`,
        );
      }
      return entry;
    });
  }

  return {
    granterAddress: candidate.granterAddress,
    auditorAddress: candidate.auditorAddress,
    granterX25519Base58: candidate.granterX25519Base58,
    auditorX25519Base58: candidate.auditorX25519Base58,
    grantNonce: candidate.grantNonce,
    issuanceSignature: candidate.issuanceSignature,
    invoiceScopeIds,
    label,
  };
}

export function parseRevokeGrantInput(value: unknown): { revocationSignature: string } {
  if (!value || typeof value !== "object") {
    throw new AuditValidationError("Request body is required.");
  }

  const candidate = value as Record<string, unknown>;

  assertString(candidate.revocationSignature, "revocationSignature");
  if (!TX_SIGNATURE_REGEX.test(candidate.revocationSignature)) {
    throw new AuditValidationError("revocationSignature is not valid base58.");
  }

  return { revocationSignature: candidate.revocationSignature };
}
