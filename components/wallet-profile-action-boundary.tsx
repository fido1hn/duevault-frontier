"use client";

import type { ComponentProps } from "react";

import { AppPrivyProvider } from "@/components/providers/privy-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { Button } from "@/components/ui/button";
import { WalletProfileAction } from "@/components/wallet-profile-action";

type WalletProfileActionBoundaryProps = ComponentProps<typeof WalletProfileAction>;

export default function WalletProfileActionBoundary(
  props: WalletProfileActionBoundaryProps,
) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <Button type="button" size={props.size} disabled>
        {props.children}
      </Button>
    );
  }

  return (
    <AppPrivyProvider>
      <AppQueryProvider>
        <WalletProfileAction {...props} />
      </AppQueryProvider>
    </AppPrivyProvider>
  );
}
