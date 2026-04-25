import type { InvoiceStatus, SerializedUmbraInvoicePayment } from "@/features/invoices/types";
import type { SettlementClaimResultSummary } from "@/features/merchant-profiles/umbra-settlement-claim";

type ClaimSettlementPayload = {
  createUtxoSignature?: unknown;
  claimResult?: unknown;
};

type ClaimPersistenceInput = {
  authMerchantProfileId: string;
  invoiceMerchantProfileId: string;
  invoiceStatus: InvoiceStatus;
  paymentStatus: SerializedUmbraInvoicePayment["status"];
};

const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;
const SOLANA_SIGNATURE_MIN_LENGTH = 64;
const SOLANA_SIGNATURE_MAX_LENGTH = 88;

export class UmbraClaimSettlementError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "UmbraClaimSettlementError";
  }
}

function fail(message: string, status = 400): never {
  throw new UmbraClaimSettlementError(message, status);
}

function getRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function validateSignature(value: string, label: string) {
  if (
    value.length < SOLANA_SIGNATURE_MIN_LENGTH ||
    value.length > SOLANA_SIGNATURE_MAX_LENGTH ||
    !BASE58_PATTERN.test(value)
  ) {
    fail(`${label} must be a valid Solana transaction signature.`);
  }

  return value;
}

function isCompletedClaimResultSummary(
  value: unknown,
): value is SettlementClaimResultSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const claimResult = value as Partial<SettlementClaimResultSummary>;

  return (
    typeof claimResult.completedBatchCount === "number" &&
    claimResult.completedBatchCount > 0 &&
    Array.isArray(claimResult.batches) &&
    claimResult.batches.length > 0 &&
    claimResult.batches.every(
      (batch) =>
        Boolean(batch) &&
        typeof batch === "object" &&
        !Array.isArray(batch) &&
        "status" in batch &&
        batch.status === "completed",
    )
  );
}

export function parseUmbraClaimSettlementPayload(
  payload: ClaimSettlementPayload,
) {
  const createUtxoSignature = validateSignature(
    getRequiredString(payload.createUtxoSignature, "Create UTXO signature"),
    "Create UTXO signature",
  );

  if (!isCompletedClaimResultSummary(payload.claimResult)) {
    fail("Claim result must include at least one completed claim batch.");
  }

  return {
    createUtxoSignature,
    claimResult: payload.claimResult,
  };
}

export function assertUmbraClaimPersistenceAllowed({
  authMerchantProfileId,
  invoiceMerchantProfileId,
  invoiceStatus,
  paymentStatus,
}: ClaimPersistenceInput) {
  if (authMerchantProfileId !== invoiceMerchantProfileId) {
    fail("Invoice not found.", 404);
  }

  if (invoiceStatus === "Claimed" || invoiceStatus === "Settled") {
    return { alreadyClaimed: true };
  }

  if (paymentStatus !== "confirmed") {
    fail("Only confirmed Umbra payments can be claimed.", 409);
  }

  return { alreadyClaimed: false };
}
