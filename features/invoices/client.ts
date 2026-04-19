import type {
  CreateInvoiceInput,
  SerializedInvoice,
} from "@/features/invoices/types";

type InvoicesResponse = {
  invoices?: SerializedInvoice[];
  error?: string;
};

type InvoiceResponse = {
  invoice?: SerializedInvoice;
  error?: string;
};

export async function listInvoicesClient() {
  const response = await fetch("/api/invoices", {
    cache: "no-store",
  });
  const payload = (await response.json()) as InvoicesResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load invoices.");
  }

  return payload.invoices ?? [];
}

export async function getInvoiceClient(invoiceId: string) {
  const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as InvoiceResponse;

  if (!response.ok || !payload.invoice) {
    throw new Error(payload.error ?? "Invoice not found.");
  }

  return payload.invoice;
}

export async function createInvoiceClient(input: CreateInvoiceInput) {
  const response = await fetch("/api/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as InvoiceResponse;

  if (!response.ok || !payload.invoice) {
    throw new Error(payload.error ?? "Unable to create invoice.");
  }

  return payload.invoice;
}
