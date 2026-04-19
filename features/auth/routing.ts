"use client";

import type { GetAuthToken } from "@/features/auth/client";
import { getMerchantProfileClient } from "@/features/merchant-profiles/client";

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

export async function resolvePostAuthPath(
  destination: string | null | undefined,
  getAuthToken: GetAuthToken,
) {
  const safeDestination = getSafeNextPath(destination);

  try {
    const profile = await getMerchantProfileClient(getAuthToken);

    return profile ? safeDestination : buildOnboardingPath(safeDestination);
  } catch {
    return buildOnboardingPath(safeDestination);
  }
}
