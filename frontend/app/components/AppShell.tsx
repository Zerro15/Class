"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthNav } from "@/app/components/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            ClassFlow
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/students" className="text-slate-600 hover:text-slate-900">
              Ученики
            </Link>
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Дашборд
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
