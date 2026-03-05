"use client";

import { SessionProvider } from "@/app/components/SessionProvider";
import { ToastProvider } from "@/app/components/ToastProvider";
import { UnsavedChangesProvider } from "@/app/components/UnsavedChangesProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
