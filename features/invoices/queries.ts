"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmUmbraInvoicePaymentClient,
  createInvoiceClient,
  getInvoiceClient,
  listInvoicesClient,
} from "@/features/invoices/client";
import type {
  ConfirmUmbraInvoicePaymentInput,
  CreateInvoiceInput,
  SerializedInvoice,
} from "@/features/invoices/types";
import { queryKeys } from "@/features/query/keys";

type UseInvoicesQueryOptions = {
  initialData?: SerializedInvoice[];
};

export function useInvoicesQuery(options: UseInvoicesQueryOptions = {}) {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => listInvoicesClient(getAccessToken),
    enabled: ready && authenticated,
    initialData: options.initialData,
  });
}

export function useInvoiceQuery(invoiceId: string) {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.invoice(invoiceId),
    queryFn: () => getInvoiceClient(invoiceId, getAccessToken),
    enabled: ready && authenticated && invoiceId.length > 0,
  });
}

export function useCreateInvoiceMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      createInvoiceClient(input, getAccessToken),
    onSuccess: (invoice) => {
      queryClient.setQueryData(queryKeys.invoice(invoice.id), invoice);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
  });
}

export function useConfirmUmbraInvoicePaymentMutation(invoiceId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmUmbraInvoicePaymentInput) =>
      confirmUmbraInvoicePaymentClient(invoiceId, input, getAccessToken),
    onSuccess: (invoice) => {
      queryClient.setQueryData(queryKeys.invoice(invoice.id), invoice);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
  });
}
