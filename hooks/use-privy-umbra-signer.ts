"use client";

import { useMemo } from "react";
import {
  useSignMessage,
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";

export function usePrivyUmbraSigner(walletAddress: string | null) {
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { signMessage } = useSignMessage();

  const wallet = useMemo(
    () =>
      walletAddress
        ? (wallets.find((w) => w.address === walletAddress) ?? null)
        : null,
    [walletAddress, wallets],
  );

  return {
    wallets,
    wallet,
    walletsReady,
    signTransaction,
    signMessage,
  };
}
