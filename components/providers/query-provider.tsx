"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { shouldRetryQuery } from "@/features/query/retry";

type AppQueryProviderProps = {
  children: ReactNode;
};

export function AppQueryProvider({ children }: AppQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: shouldRetryQuery,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
