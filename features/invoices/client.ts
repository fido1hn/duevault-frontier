import type {
  ConfirmUmbraInvoicePaymentInput,
  CreateInvoiceInput,
  SerializedInvoice,
} from "@/features/invoices/types";
import type { ProofPacket } from "@/features/invoices/proof-packet";
import {
  authenticatedFetch,
  createApiClientError,
  type GetAuthToken,
} from "@/features/auth/client";

type InvoicesResponse = {
  invoices?: SerializedInvoice[];
  error?: string;
};

type InvoiceResponse = {
  invoice?: SerializedInvoice;
  error?: string;
};

export async function listInvoicesClient(getAuthToken: GetAuthToken) {
  const response = await authenticatedFetch(
    "/api/invoices",
    {
      cache: "no-store",
    },
    getAuthToken,
  );
  const payload = (await response.json()) as InvoicesResponse;

  if (!response.ok) {
    throw createApiClientError(
      response,
      "Unable to load invoices.",
      payload.error,
    );
  }

  return payload.invoices ?? [];
}

export async function getInvoiceClient(
  invoiceId: string,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    `/api/invoices/${encodeURIComponent(invoiceId)}`,
    {
      cache: "no-store",
    },
    getAuthToken,
  );
  const payload = (await response.json()) as InvoiceResponse;

  if (!response.ok || !payload.invoice) {
    throw createApiClientError(response, "Invoice not found.", payload.error);
  }

  return payload.invoice;
}

export async function createInvoiceClient(
  input: CreateInvoiceInput,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    "/api/invoices",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as InvoiceResponse;

  if (!response.ok || !payload.invoice) {
    throw createApiClientError(
      response,
      "Unable to create invoice.",
      payload.error,
    );
  }

  return payload.invoice;
}

export async function confirmUmbraInvoicePaymentClient(
  invoiceId: string,
  input: ConfirmUmbraInvoicePaymentInput,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    `/api/invoices/${encodeURIComponent(invoiceId)}/umbra-payment/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    getAuthToken,
  );
  const payload = (await response.json()) as InvoiceResponse;

  if (!response.ok || !payload.invoice) {
    throw createApiClientError(
      response,
      "Unable to confirm Umbra payment.",
      payload.error,
    );
  }

  return payload.invoice;
}

type ProofPacketResponse = {
  packet?: ProofPacket;
  error?: string;
};

export async function getInvoiceProofPacketClient(
  invoiceId: string,
  getAuthToken: GetAuthToken,
) {
  const response = await authenticatedFetch(
    `/api/invoices/${encodeURIComponent(invoiceId)}/proof-packet`,
    { cache: "no-store" },
    getAuthToken,
  );
  const payload = (await response.json()) as ProofPacketResponse;

  if (!response.ok || !payload.packet) {
    throw createApiClientError(
      response,
      "Unable to generate proof packet.",
      payload.error,
    );
  }

  return payload.packet;
}
