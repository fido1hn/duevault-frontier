import type {
  SerializedMerchantProfile,
  UpsertMerchantProfileInput,
} from "@/features/merchant-profiles/types";

type ProfileResponse = {
  profile?: SerializedMerchantProfile | null;
  error?: string;
};

export async function getMerchantProfileByWalletClient(walletAddress: string) {
  const response = await fetch(
    `/api/merchant-profile?walletAddress=${encodeURIComponent(walletAddress)}`,
    {
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as ProfileResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load merchant profile.");
  }

  return payload.profile ?? null;
}

export async function upsertMerchantProfileClient(
  input: UpsertMerchantProfileInput,
) {
  const response = await fetch("/api/merchant-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as ProfileResponse;

  if (!response.ok || !payload.profile) {
    throw new Error(payload.error ?? "Unable to save company profile.");
  }

  return payload.profile;
}
