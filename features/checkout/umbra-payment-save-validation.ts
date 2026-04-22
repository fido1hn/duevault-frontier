import { PublicKey } from "@solana/web3.js";

export type UmbraPaymentSavePayload = {
  payerWalletAddress?: unknown;
  network?: unknown;
  mint?: unknown;
  amountAtomic?: unknown;
  merchantUmbraWalletAddress?: unknown;
  optionalData?: unknown;
  closeProofAccountSignature?: unknown;
  createProofAccountSignature?: unknown;
  createUtxoSignature?: unknown;
};

export type ParsedUmbraPaymentSavePayload = {
  payerWalletAddress: string;
  network: string;
  mint: string;
  amountAtomic: string;
  merchantUmbraWalletAddress: string;
  optionalData: string;
  closeProofAccountSignature: string | null;
  createProofAccountSignature: string;
  createUtxoSignature: string;
  signatures: string[];
};

export type ComparableUmbraPaymentSubmission = {
  invoiceId: string;
  merchantProfileId: string;
  payerWalletAddress: string;
  merchantUmbraWalletAddress: string;
  network: string;
  mint: string;
  amountAtomic: string;
  optionalData: string;
  closeProofAccountSignature: string | null;
  createProofAccountSignature: string;
  createUtxoSignature: string;
};

const MAX_PUBLIC_ID_LENGTH = 128;
const MAX_PAYMENT_SAVE_BODY_BYTES = 10_000;
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;
const HEX_32_BYTE_PATTERN = /^[0-9a-f]{64}$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const SOLANA_SIGNATURE_MIN_LENGTH = 64;
const SOLANA_SIGNATURE_MAX_LENGTH = 88;

export class UmbraPaymentSaveValidationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "UmbraPaymentSaveValidationError";
  }
}

function fail(message: string, status = 400): never {
  throw new UmbraPaymentSaveValidationError(message, status);
}

function getRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is required.`);
  }

  return value.trim();
}

function validatePublicKey(value: string, label: string) {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    fail(`${label} must be a valid Solana address.`);
  }
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

function validateOptionalSignature(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return validateSignature(
    getRequiredString(value, "Close proof account signature"),
    "Close proof account signature",
  );
}

function validateDistinctSignatures(signatures: string[]) {
  if (new Set(signatures).size !== signatures.length) {
    fail("Umbra payment signatures must be distinct.");
  }
}

export function validateCheckoutPublicId(value: string) {
  const publicId = value.trim();

  if (
    !publicId ||
    publicId.length > MAX_PUBLIC_ID_LENGTH ||
    !PUBLIC_ID_PATTERN.test(publicId)
  ) {
    fail("Checkout id is invalid.");
  }

  return publicId;
}

export async function readUmbraPaymentSavePayload(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > MAX_PAYMENT_SAVE_BODY_BYTES
  ) {
    fail("Umbra payment submission is too large.", 413);
  }

  const body = await request.text();
  const bodySize = new TextEncoder().encode(body).byteLength;

  if (bodySize > MAX_PAYMENT_SAVE_BODY_BYTES) {
    fail("Umbra payment submission is too large.", 413);
  }

  try {
    const payload = JSON.parse(body) as unknown;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      fail("Umbra payment submission must be a JSON object.");
    }

    return payload as UmbraPaymentSavePayload;
  } catch (error) {
    if (error instanceof UmbraPaymentSaveValidationError) {
      throw error;
    }

    fail("Umbra payment submission must be valid JSON.");
  }
}

export function parseUmbraPaymentSavePayload(
  payload: UmbraPaymentSavePayload,
): ParsedUmbraPaymentSavePayload {
  const payerWalletAddress = validatePublicKey(
    getRequiredString(payload.payerWalletAddress, "Payer wallet address"),
    "Payer wallet address",
  );
  const merchantUmbraWalletAddress = validatePublicKey(
    getRequiredString(
      payload.merchantUmbraWalletAddress,
      "Merchant Umbra wallet address",
    ),
    "Merchant Umbra wallet address",
  );
  const mint = validatePublicKey(
    getRequiredString(payload.mint, "Payment mint"),
    "Payment mint",
  );
  const network = getRequiredString(payload.network, "Umbra network");
  const amountAtomic = getRequiredString(payload.amountAtomic, "Payment amount");
  const optionalData = getRequiredString(
    payload.optionalData,
    "Invoice reference",
  ).toLowerCase();
  const closeProofAccountSignature = validateOptionalSignature(
    payload.closeProofAccountSignature,
  );
  const createProofAccountSignature = validateSignature(
    getRequiredString(
      payload.createProofAccountSignature,
      "Create proof account signature",
    ),
    "Create proof account signature",
  );
  const createUtxoSignature = validateSignature(
    getRequiredString(payload.createUtxoSignature, "Create UTXO signature"),
    "Create UTXO signature",
  );

  if (!POSITIVE_INTEGER_PATTERN.test(amountAtomic)) {
    fail("Payment amount must be a positive integer string.");
  }

  if (!HEX_32_BYTE_PATTERN.test(optionalData)) {
    fail("Invoice reference must be a 32-byte hex string.");
  }

  const signatures = [
    closeProofAccountSignature,
    createProofAccountSignature,
    createUtxoSignature,
  ].filter((signature): signature is string => Boolean(signature));

  validateDistinctSignatures(signatures);

  return {
    payerWalletAddress,
    network,
    mint,
    amountAtomic,
    merchantUmbraWalletAddress,
    optionalData,
    closeProofAccountSignature,
    createProofAccountSignature,
    createUtxoSignature,
    signatures,
  };
}

export function matchesUmbraPaymentSubmission(
  existing: ComparableUmbraPaymentSubmission,
  expected: ComparableUmbraPaymentSubmission,
) {
  return (
    existing.invoiceId === expected.invoiceId &&
    existing.merchantProfileId === expected.merchantProfileId &&
    existing.payerWalletAddress === expected.payerWalletAddress &&
    existing.merchantUmbraWalletAddress === expected.merchantUmbraWalletAddress &&
    existing.network === expected.network &&
    existing.mint === expected.mint &&
    existing.amountAtomic === expected.amountAtomic &&
    existing.optionalData === expected.optionalData &&
    existing.closeProofAccountSignature === expected.closeProofAccountSignature &&
    existing.createProofAccountSignature === expected.createProofAccountSignature &&
    existing.createUtxoSignature === expected.createUtxoSignature
  );
}
