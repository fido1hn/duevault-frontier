"use client";

export const DEFAULT_POST_AUTH_DESTINATION = "/dashboard";

export function getSafeNextPath(value: string | null | undefined) {
  const normalized = value?.trim();

  if (
    normalized &&
    normalized.startsWith("/") &&
    !normalized.startsWith("//")
  ) {
    return normalized;
  }

  return DEFAULT_POST_AUTH_DESTINATION;
}

export function buildOnboardingPath(destination?: string | null) {
  const safeDestination = getSafeNextPath(destination);

  return `/onboarding?next=${encodeURIComponent(safeDestination)}`;
}
