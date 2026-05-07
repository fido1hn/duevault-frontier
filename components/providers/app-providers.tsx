"use client";

import { AppPrivyProvider } from "@/components/providers/privy-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppPrivyProvider>
      <AppQueryProvider>
        {children}
        <Toaster richColors position="bottom-right" />
      </AppQueryProvider>
    </AppPrivyProvider>
  );
}
