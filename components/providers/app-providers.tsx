"use client";

import { AppPrivyProvider } from "@/components/providers/privy-provider";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppPrivyProvider>
      {children}
      <Toaster richColors position="bottom-right" />
    </AppPrivyProvider>
  );
}
