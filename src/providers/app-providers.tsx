"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/query-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider delay={300}>
        {children}
        <Toaster theme="light" position="top-right" richColors closeButton />
      </TooltipProvider>
    </QueryProvider>
  );
}
