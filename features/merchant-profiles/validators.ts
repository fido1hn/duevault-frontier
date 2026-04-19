import {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
  sanitizeRequired,
} from "@/features/invoices/validators";

export {
  assertInvoiceMint,
  assertPaymentRail,
  assertPrivacyRail,
};

export function sanitizeWalletAddress(value: string) {
  const normalized = sanitizeRequired(value, "Wallet address");

  if (normalized.length < 32) {
    throw new Error("Wallet address is too short.");
  }

  return normalized;
}

export function sanitizeContactEmail(value: string) {
  const normalized = sanitizeRequired(value, "Contact email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Contact email must be a valid email address.");
  }

  return normalized;
}

export { sanitizeRequired };
