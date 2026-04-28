"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  claimUmbraInvoicePaymentClient,
  confirmUmbraInvoicePaymentClient,
  createInvoiceClient,
  getInvoiceClient,
  listInvoicesClient,
} from "@/features/invoices/client";
import type {
  ClaimUmbraInvoicePaymentInput,
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
    refetchInterval: (query) => {
      const invoice = query.state.data;
      console.log(invoice);
      if (!invoice) return 5_000;
      const paymentStatus = invoice.latestUmbraPayment?.status ?? null;
      if (
        invoice.status === "Claimed" ||
        invoice.status === "Settled" ||
        paymentStatus === "confirmed"
      ) {
        return false;
      }
      return 5_000;
    },
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

export function useClaimUmbraInvoicePaymentMutation(invoiceId: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClaimUmbraInvoicePaymentInput) =>
      claimUmbraInvoicePaymentClient(invoiceId, input, getAccessToken),
    onSuccess: (invoice) => {
      queryClient.setQueryData(queryKeys.invoice(invoice.id), invoice);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
  });
}
