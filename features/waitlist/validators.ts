const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_OPTIONAL_LENGTH = 240;
const MAX_USE_CASE_LENGTH = 600;

export function sanitizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Email is required.");
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  return normalized;
}

export function sanitizeOptional(
  value: string | undefined,
  maxLength = MAX_OPTIONAL_LENGTH,
) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function sanitizeUseCase(value: string | undefined) {
  return sanitizeOptional(value, MAX_USE_CASE_LENGTH);
}

export function sanitizeSource(value: string | undefined) {
  const normalized = value?.trim() || "homepage";

  return normalized.slice(0, 80);
}
