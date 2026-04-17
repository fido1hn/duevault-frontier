"use client";

import { Suspense, type ReactNode } from "react";
import { motion } from "motion/react";

import { MerchantProfileProvider } from "@/components/merchant-profile-gate";
import { Sidebar } from "@/components/layout/sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading workspace...
        </div>
      }
    >
      <MerchantProfileProvider>
        <div className="flex min-h-screen w-full flex-col overflow-hidden bg-background md:flex-row">
          <Sidebar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </MerchantProfileProvider>
    </Suspense>
  );
}
