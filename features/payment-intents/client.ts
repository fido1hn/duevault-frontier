import type {
  CreatePaymentIntentInput,
  PaymentIntentStatus,
  SerializedPaymentIntent,
  UpdatePaymentIntentInput,
} from "@/features/payment-intents/types";
import { authenticatedFetch, type GetAuthToken } from "@/features/auth/client";

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
    throw new Error(payload.error ?? "Unable to load payment requests.");
  }

  return payload.intents ?? [];
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
    throw new Error(payload.error ?? "Unable to create payment request.");
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
    throw new Error(payload.error ?? "Unable to update payment request.");
  }

  return payload.intent;
}
