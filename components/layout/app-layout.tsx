"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { Sidebar } from "@/components/layout/sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
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
  );
}
