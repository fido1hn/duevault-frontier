"use client";

import { useCallback, useMemo, useRef } from "react";
import type { MasterSeed } from "@umbra-privacy/sdk/types";

import type { DueVaultConfig } from "@/lib/umbra/sdk";

type MasterSeedStorage = NonNullable<DueVaultConfig["masterSeedStorage"]>;

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
