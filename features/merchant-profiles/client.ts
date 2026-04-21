import type {
  SaveUmbraRegistrationInput,
  SerializedMerchantProfile,
  UpsertMerchantProfileInput,
} from "@/features/merchant-profiles/types";
import {
  authenticatedFetch,
  createApiClientError,
  type GetAuthToken,
} from "@/features/auth/client";

type ProfileResponse = {
  profile?: SerializedMerchantProfile | null;
  error?: string;
};

export async function getMerchantProfileClient(getAuthToken: GetAuthToken) {
  const response = await authenticatedFetch(
    "/api/merchant-profile",
    {
      cache: "no-store",
    },
    getAuthToken,
  );
  const payload = (await response.json()) as ProfileResponse;

  if (!response.ok) {
    throw createApiClientError(
      response,
      "Unable to load merchant profile.",
      payload.error,
    );
  }

  return payload.profile ?? null;
}

export async function upsertMerchantProfileClient(
  input: UpsertMerchantProfileInput,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    "/api/merchant-profile",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as ProfileResponse;

  if (!response.ok || !payload.profile) {
    throw createApiClientError(
      response,
      "Unable to save company profile.",
      payload.error,
    );
  }

  return payload.profile;
}

export async function saveUmbraRegistrationClient(
  input: SaveUmbraRegistrationInput,
  getAuthToken: GetAuthToken,
) {
  let response: Response;

  try {
    response = await authenticatedFetch(
      "/api/merchant-profile/umbra-registration",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
      getAuthToken,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Failed to fetch" || error.message === "fetch failed")
    ) {
      throw new Error(
        "Unable to reach the DueVault Umbra save endpoint. Restart the dev server and retry.",
      );
    }

    throw error;
  }

  const payload = (await response.json()) as ProfileResponse;

  if (!response.ok || !payload.profile) {
    throw createApiClientError(
      response,
      "Unable to save Umbra registration.",
      payload.error,
    );
  }

  return payload.profile;
}
