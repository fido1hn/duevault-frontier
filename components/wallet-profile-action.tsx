"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLogin, usePrivy } from "@privy-io/react-auth";

import {
  getLinkedSolanaWallets,
  SOLANA_WALLET_LIST,
} from "@/features/auth/privy-wallets";
import { getSafeNextPath } from "@/features/auth/routing";

export type WalletProfileActionControllerProps = {
  destination: string;
  actionSignal: number;
  onActionHandled: (actionSignal: number) => void;
  onBusyChange?: (isBusy: boolean) => void;
};

export function WalletProfileActionController({
  destination,
  actionSignal,
  onActionHandled,
  onBusyChange,
}: WalletProfileActionControllerProps) {
  const router = useRouter();
  const { authenticated, linkWallet, ready, user } = usePrivy();
  const [isRouting, startRouting] = useTransition();
  const handledActionSignalRef = useRef(0);
  const hasSolanaWallet = getLinkedSolanaWallets(user).length > 0;

  useEffect(() => {
    onBusyChange?.(isRouting);
  }, [isRouting, onBusyChange]);

  const routeAfterAuth = useCallback((target: string) => {
    const nextPath = getSafeNextPath(target);

    startRouting(() => {
      router.push(nextPath);
    });
  }, [router]);

  const { login } = useLogin({
    onComplete: () => {
      routeAfterAuth(destination);
    },
  });

  const handleAction = useCallback(
    (signal: number) => {
      if (!ready) return;

      if (!authenticated) {
        login({
          loginMethods: ["wallet", "email"],
          walletChainType: "solana-only",
        });
        onActionHandled(signal);
        return;
      }

      if (!hasSolanaWallet) {
        linkWallet({
          walletChainType: "solana-only",
          walletList: SOLANA_WALLET_LIST,
        });
        onActionHandled(signal);
        return;
      }

      routeAfterAuth(destination);
      onActionHandled(signal);
    },
    [
      authenticated,
      destination,
      hasSolanaWallet,
      linkWallet,
      login,
      onActionHandled,
      ready,
      routeAfterAuth,
    ],
  );

  useEffect(() => {
    if (
      actionSignal <= 0 ||
      actionSignal === handledActionSignalRef.current ||
      !ready
    ) {
      return;
    }

    handledActionSignalRef.current = actionSignal;
    handleAction(actionSignal);
  }, [actionSignal, handleAction, ready]);

  return null;
}
