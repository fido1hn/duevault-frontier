"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMerchantProfileByWalletClient } from "@/features/merchant-profiles/client";
import { useWalletConnectionRequest } from "@/hooks/use-wallet-connection-request";

type WalletProfileActionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  destination: string;
};

function buildOnboardingPath(destination: string) {
  return `/onboarding?next=${encodeURIComponent(destination)}`;
}

export function WalletProfileAction({
  destination,
  children,
  disabled,
  ...buttonProps
}: WalletProfileActionProps) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const clearPendingDestination = useCallback(() => {
    setPendingDestination(null);
  }, []);
  const { isConnectingWallet, requestWalletConnection } =
    useWalletConnectionRequest({
      onCancel: clearPendingDestination,
      onError: clearPendingDestination,
    });

  const routeForWallet = useCallback(
    async (walletAddress: string, target: string) => {
      setIsChecking(true);

      try {
        const profile = await getMerchantProfileByWalletClient(walletAddress);

        router.push(profile ? target : buildOnboardingPath(target));
      } catch {
        router.push(buildOnboardingPath(target));
      } finally {
        setIsChecking(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!pendingDestination || !publicKey) return;

    const target = pendingDestination;
    setPendingDestination(null);
    void routeForWallet(publicKey.toBase58(), target);
  }, [pendingDestination, publicKey, routeForWallet]);

  function handleClick() {
    if (!publicKey) {
      setPendingDestination(destination);
      requestWalletConnection();
      return;
    }

    void routeForWallet(publicKey.toBase58(), destination);
  }

  return (
    <Button
      type="button"
      disabled={disabled || isChecking || isConnectingWallet}
      onClick={handleClick}
      {...buttonProps}
    >
      {(isChecking || isConnectingWallet) && (
        <Loader2 className="size-4 animate-spin" />
      )}
      {children}
    </Button>
  );
}
