"use client";

import { AuthGuard } from "@/app/components/AuthGuard";
import { AuthProvider } from "@/app/components/AuthProvider";
import { AuthNav } from "@/app/components/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <a href="/dashboard" className="text-lg font-semibold">
              ClassFlow
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/students" className="text-slate-600 hover:text-slate-900">
                Ученики
              </a>
              <a href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Дашборд
              </a>
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </AuthProvider>
  );
}
