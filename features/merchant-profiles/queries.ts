"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GetAuthToken } from "@/features/auth/client";
import {
  getMerchantProfileClient,
  saveUmbraRegistrationClient,
  upsertMerchantProfileClient,
} from "@/features/merchant-profiles/client";
import type {
  SaveUmbraRegistrationInput,
  UpsertMerchantProfileInput,
} from "@/features/merchant-profiles/types";
import { queryKeys } from "@/features/query/keys";

type UseMerchantProfileQueryOptions = {
  enabled?: boolean;
};

export function merchantProfileQueryOptions(getAuthToken: GetAuthToken) {
  return {
    queryKey: queryKeys.merchantProfile,
    queryFn: () => getMerchantProfileClient(getAuthToken),
  };
}

export function useMerchantProfileQuery(
  options: UseMerchantProfileQueryOptions = {},
) {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    ...merchantProfileQueryOptions(getAccessToken),
    enabled: options.enabled ?? (ready && authenticated),
  });
}

export function useUpsertMerchantProfileMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertMerchantProfileInput) =>
      upsertMerchantProfileClient(input, getAccessToken),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.merchantProfile, profile);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.merchantProfile,
      });
    },
  });
}

export function useSaveUmbraRegistrationMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveUmbraRegistrationInput) =>
      saveUmbraRegistrationClient(input, getAccessToken),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.merchantProfile, profile);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.merchantProfile,
      });
    },
  });
}
