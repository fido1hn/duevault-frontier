"use client";

import { AppWalletProvider } from "@/components/providers/wallet-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <AppWalletProvider>{children}</AppWalletProvider>;
}
