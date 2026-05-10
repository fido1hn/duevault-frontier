"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getGrantClient,
  issueAndPersistGrant,
  listGrantsClient,
  revokeAndPersistGrant,
  type SdkGrant,
} from "@/features/audit/client";
import type { IssueGrantInput } from "@/features/audit/types";
import { queryKeys } from "@/features/query/keys";
import type { DueVaultConfig } from "@/lib/umbra/sdk";

export function useGrantsQuery() {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.complianceGrants,
    queryFn: () => listGrantsClient(getAccessToken),
    enabled: ready && authenticated,
  });
}

export function useGrantQuery(grantId: string) {
  const { authenticated, getAccessToken, ready } = usePrivy();

  return useQuery({
    queryKey: queryKeys.complianceGrant(grantId),
    queryFn: () => getGrantClient(grantId, getAccessToken),
    enabled: ready && authenticated && grantId.length > 0,
  });
}

export function useIssueGrantMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      config: DueVaultConfig;
      input: IssueGrantInput & { granterAddress: string };
    }) => issueAndPersistGrant(args.config, args.input, getAccessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.complianceGrants,
      });
    },
  });
}

export function useRevokeGrantMutation() {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      config: DueVaultConfig;
      grant: SdkGrant;
      grantId: string;
    }) =>
      revokeAndPersistGrant(args.config, args.grant, args.grantId, getAccessToken),
    onSuccess: (grant) => {
      queryClient.setQueryData(queryKeys.complianceGrant(grant.id), grant);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.complianceGrants,
      });
    },
  });
}
