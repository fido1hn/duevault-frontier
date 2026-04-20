"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getLinkedSolanaWallets,
  SOLANA_WALLET_LIST,
} from "@/features/auth/privy-wallets";
import { buildOnboardingPath, getSafeNextPath } from "@/features/auth/routing";
import { merchantProfileQueryOptions } from "@/features/merchant-profiles/queries";

type WalletProfileActionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  destination: string;
};

export function WalletProfileAction({
  destination,
  children,
  disabled,
  ...buttonProps
}: WalletProfileActionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authenticated, getAccessToken, linkWallet, ready, user } = usePrivy();
  const [isChecking, setIsChecking] = useState(false);
  const hasSolanaWallet = getLinkedSolanaWallets(user).length > 0;

  async function routeAfterAuth(target: string) {
    setIsChecking(true);

    try {
      const safeTarget = getSafeNextPath(target);
      const profile = await queryClient
        .ensureQueryData(merchantProfileQueryOptions(getAccessToken))
        .catch(() => null);
      const nextPath = profile ? safeTarget : buildOnboardingPath(safeTarget);

      router.push(nextPath);
    } finally {
      setIsChecking(false);
    }
  }

  const { login } = useLogin({
    onComplete: () => {
      void routeAfterAuth(destination);
    },
  });

  function handleClick() {
    if (!ready) return;

    if (!authenticated) {
      login({
        loginMethods: ["wallet", "email"],
        walletChainType: "solana-only",
      });
      return;
    }

    if (!hasSolanaWallet) {
      linkWallet({
        walletChainType: "solana-only",
        walletList: SOLANA_WALLET_LIST,
      });
      return;
    }

    void routeAfterAuth(destination);
  }

  return (
    <Button
      type="button"
      disabled={disabled || !ready || isChecking}
      onClick={handleClick}
      {...buttonProps}
    >
      {isChecking && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
