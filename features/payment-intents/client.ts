import type {
  CreatePaymentIntentInput,
  PaymentIntentStatus,
  SerializedPaymentIntent,
  UpdatePaymentIntentInput,
} from "@/features/payment-intents/types";
import {
  authenticatedFetch,
  createApiClientError,
  type GetAuthToken,
} from "@/features/auth/client";

type PaymentIntentsResponse = {
  intents?: SerializedPaymentIntent[];
  error?: string;
};

type PaymentIntentResponse = {
  intent?: SerializedPaymentIntent;
  error?: string;
};

export async function listPaymentIntentsClient(getAuthToken: GetAuthToken) {
  const response = await authenticatedFetch(
    "/api/payment-intents",
    {
      cache: "no-store",
    },
    getAuthToken,
  );
  const payload = (await response.json()) as PaymentIntentsResponse;

  if (!response.ok) {
    throw createApiClientError(
      response,
      "Unable to load payment requests.",
      payload.error,
    );
  }

  return payload.intents ?? [];
}

export async function getPaymentIntentClient(
  intentId: string,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    `/api/payment-intents/${encodeURIComponent(intentId)}`,
    {
      cache: "no-store",
    },
    getAuthToken,
  );
  const payload = (await response.json()) as PaymentIntentResponse;

  if (!response.ok || !payload.intent) {
    throw createApiClientError(
      response,
      "Payment request not found.",
      payload.error,
    );
  }

  return payload.intent;
}

export async function createPaymentIntentClient(
  input: CreatePaymentIntentInput,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    "/api/payment-intents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as PaymentIntentResponse;

  if (!response.ok || !payload.intent) {
    throw createApiClientError(
      response,
      "Unable to create payment request.",
      payload.error,
    );
  }

  return payload.intent;
}

export async function updatePaymentIntentClient(
  intentId: string,
  input: UpdatePaymentIntentInput & { status?: PaymentIntentStatus },
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    `/api/payment-intents/${intentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as PaymentIntentResponse;

  if (!response.ok || !payload.intent) {
    throw createApiClientError(
      response,
      "Unable to update payment request.",
      payload.error,
    );
  }

  return payload.intent;
}
