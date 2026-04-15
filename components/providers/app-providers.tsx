"use client";

import { AppWalletProvider } from "@/components/providers/wallet-provider";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppWalletProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </AppWalletProvider>
  );
}
