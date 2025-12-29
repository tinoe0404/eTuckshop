"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 🚀 PERFORMANCE SETTINGS
            staleTime: 1000 * 60 * 5, // 5 Minutes (Data stays "fresh")
            gcTime: 1000 * 60 * 10,   // 10 Minutes (Keep unused data in memory)
            retry: 1,                 // Retry failed requests once
            refetchOnWindowFocus: false, // Don't refetch when switching tabs
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}