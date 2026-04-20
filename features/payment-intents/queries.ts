"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPaymentIntentClient,
  getPaymentIntentClient,
  listPaymentIntentsClient,
  updatePaymentIntentClient,
} from "@/features/payment-intents/client";
import type {
  CreatePaymentIntentInput,
  PaymentIntentStatus,
  UpdatePaymentIntentInput,
} from "@/features/payment-intents/types";
import { queryKeys } from "@/features/query/keys";

export function usePaymentIntentsQuery() {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.paymentIntents,
    queryFn: () => listPaymentIntentsClient(getAccessToken),
    enabled: ready && authenticated,
  });
}

export function usePaymentIntentQuery(intentId: string) {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.paymentIntent(intentId),
    queryFn: () => getPaymentIntentClient(intentId, getAccessToken),
    enabled: ready && authenticated && intentId.length > 0,
  });
}

export function useCreatePaymentIntentMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePaymentIntentInput) =>
      createPaymentIntentClient(input, getAccessToken),
    onSuccess: (intent) => {
      queryClient.setQueryData(queryKeys.paymentIntent(intent.id), intent);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.paymentIntents,
      });
    },
  });
}

export function useUpdatePaymentIntentMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      intentId,
    }: {
      input: UpdatePaymentIntentInput & { status?: PaymentIntentStatus };
      intentId: string;
    }) => updatePaymentIntentClient(intentId, input, getAccessToken),
    onSuccess: (intent) => {
      queryClient.setQueryData(queryKeys.paymentIntent(intent.id), intent);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.paymentIntents,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.paymentIntent(intent.id),
      });
    },
  });
}
