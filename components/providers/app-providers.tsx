"use client";

import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster richColors position="bottom-right" />
    </>
  );
}
