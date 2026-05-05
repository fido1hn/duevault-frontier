"use client";

import { useCallback, useMemo, useRef } from "react";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import type { DueVaultConfig } from "@/lib/umbra/sdk";

type MasterSeedStorage = NonNullable<DueVaultConfig["masterSeedStorage"]>;

/**
 * Per-component-instance cache of the merchant's Umbra master seed so that
 * Scan, Claim, and any retries within a single mounted page share one
 * `signMessage` derivation instead of prompting the wallet on each click.
 *
 * Scope (deliberate):
 * - Lives in a `useRef`. Survives re-renders. Cleared on wallet switch
 *   and on unmount (navigation, refresh, route change drop the seed and
 *   the next call will re-prompt `signMessage`).
 * - Not module-scoped. A module-level seed cache would persist past
 *   wallet logout/switch unless we wired up a Privy wallet-change
 *   subscription, which is fragile across SDK versions. The seed is
 *   sensitive material; tying its lifetime to the component gives a
 *   clear eviction story.
 *
 * Caller contract:
 * - Keep retries on the same mounted component. Do not `router.push` or
 *   otherwise unmount the consumer between Scan and Claim or between
 *   claim attempts — that re-prompts `signMessage` and re-pays the
 *   Arcium cost. The settlement page (the only consumer today) honors
 *   this by setting an in-page error state instead of navigating away.
 *
 * When to revisit:
 * - If a workflow needs cross-page seed reuse (e.g., a claim queue
 *   dashboard that fans out to multiple invoice settlements), upgrade to
 *   a module-scoped cache *with* a `useStandardWallets` subscription
 *   that wipes on wallet identity change. Don't just promote the ref —
 *   the security trade-off needs explicit handling.
 */
export function useUmbraMerchantSession(
  walletAddress: string | null | undefined,
) {
  const seedRef = useRef<MasterSeed | null>(null);
  const lastWalletRef = useRef<string | null | undefined>(walletAddress);

  if (lastWalletRef.current !== walletAddress) {
    seedRef.current = null;
    lastWalletRef.current = walletAddress;
  }

  const clear = useCallback(() => {
    seedRef.current = null;
  }, []);

  const masterSeedStorage = useMemo<MasterSeedStorage>(
    () => ({
      load: async () =>
        seedRef.current
          ? {
              exists: true as const,
              seed: seedRef.current,
            }
          : {
              exists: false as const,
            },
      store: async (seed) => {
        seedRef.current = seed;

        return {
          success: true as const,
        };
      },
    }),
    [],
  );

  return { masterSeedStorage, clear };
}
