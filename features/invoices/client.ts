import type {
  CreateInvoiceInput,
  SerializedInvoice,
} from "@/features/invoices/types";
import { authenticatedFetch, type GetAuthToken } from "@/features/auth/client";

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
    throw new Error(payload.error ?? "Unable to load invoices.");
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
    throw new Error(payload.error ?? "Invoice not found.");
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
    throw new Error(payload.error ?? "Unable to create invoice.");
  }

  return payload.invoice;
}
