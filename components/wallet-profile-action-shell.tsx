"use client";

import { useCallback, useState, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WalletProfileActionController } from "@/components/wallet-profile-action";
import { getSafeNextPath } from "@/features/auth/routing";

type WalletProfileActionShellProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  destination: string;
};

export function WalletProfileActionShell({
  destination,
  children,
  disabled,
  ...buttonProps
}: WalletProfileActionShellProps) {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const [actionSignal, setActionSignal] = useState(0);
  const [pendingDestination, setPendingDestination] = useState(destination);
  const [pendingActionSignal, setPendingActionSignal] = useState<number | null>(
    null,
  );
  const [isControllerBusy, setIsControllerBusy] = useState(false);
  const isBusy = Boolean(pendingActionSignal) || isControllerBusy;

  function resolveDestination() {
    if (typeof window === "undefined") {
      return getSafeNextPath(destination);
    }

    const nextDestination = new URLSearchParams(window.location.search).get(
      "next",
    );

    return getSafeNextPath(nextDestination ?? destination);
  }

  function handleClick() {
    if (!hasPrivyAppId || isBusy) return;

    const nextDestination = resolveDestination();
    setPendingDestination(nextDestination);

    setActionSignal((currentSignal) => {
      const nextSignal = currentSignal + 1;
      setPendingActionSignal(nextSignal);
      return nextSignal;
    });
  }

  const handleActionHandled = useCallback((handledSignal: number) => {
    setPendingActionSignal((currentSignal) =>
      currentSignal === handledSignal ? null : currentSignal,
    );
  }, []);

  const handleBusyChange = useCallback((nextIsBusy: boolean) => {
    setIsControllerBusy(nextIsBusy);
  }, []);

  return (
    <>
      <Button
        type="button"
        disabled={disabled || !hasPrivyAppId || isBusy}
        onClick={handleClick}
        {...buttonProps}
      >
        {isBusy && <Loader2 className="size-4 animate-spin" />}
        {isBusy ? "Preparing..." : (children ?? "Get Started")}
      </Button>

      {hasPrivyAppId && (
        <WalletProfileActionController
          actionSignal={actionSignal}
          destination={pendingDestination}
          onActionHandled={handleActionHandled}
          onBusyChange={handleBusyChange}
        />
      )}
    </>
  );
}
