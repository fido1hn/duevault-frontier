"use client";

import { AppPrivyProvider } from "@/components/providers/privy-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import {
  WalletProfileActionController,
  type WalletProfileActionControllerProps,
} from "@/components/wallet-profile-action";

type WalletProfileActionBoundaryProps = WalletProfileActionControllerProps;

export default function WalletProfileActionBoundary(
  props: WalletProfileActionBoundaryProps,
) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null;
  }

  return (
    <AppPrivyProvider>
      <AppQueryProvider>
        <WalletProfileActionController {...props} />
      </AppQueryProvider>
    </AppPrivyProvider>
  );
}
