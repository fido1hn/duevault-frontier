export function formatAtomicAmount(amountAtomic: string, decimals = 6) {
  const normalized = amountAtomic.trim();

  if (!/^\d+$/.test(normalized)) {
    return normalized;
  }

  const padded = normalized.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

export function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "No expiry";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
