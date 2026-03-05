"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthNav } from "@/app/components/AuthNav";
import { api, ApiError, clearToken, getToken } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const [checkingSession, setCheckingSession] = useState(!isAuthPage);

  useEffect(() => {
    const ensureSession = async () => {
      if (isAuthPage) {
        setCheckingSession(false);
        return;
      }

      const token = getToken();
      if (!token) {
        router.replace("/login");
        setCheckingSession(false);
        return;
      }

      try {
        // Комментарий наставника: на защищённых экранах сверяем токен с /auth/me, чтобы после F5 состояние авторизации оставалось корректным.
        await api.me();
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          // Комментарий наставника: при 401/403 очищаем локальную сессию и уводим на login, иначе пользователь застрянет на сломанной странице.
          clearToken();
          router.replace("/login");
        }
      } finally {
        setCheckingSession(false);
      }
    };

    ensureSession();
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  if (checkingSession) {
    return <main className="px-4 py-8 text-center text-sm text-slate-500">Проверяем сессию...</main>;
  }

  const navBaseClass = "inline-flex h-9 items-center justify-center rounded-md px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const activeNavClass = "bg-slate-100 text-slate-900";
  const studentsActive = pathname.startsWith("/students");
  const dashboardActive = pathname.startsWith("/dashboard");
  const financeActive = pathname.startsWith("/finance");

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold">
            ClassFlow
          </Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/students" className={`${navBaseClass} ${studentsActive ? activeNavClass : ""}`}>
              Ученики
            </Link>
            <Link href="/dashboard" className={`${navBaseClass} ${dashboardActive ? activeNavClass : ""}`}>
              Дашборд
            </Link>
            <Link href="/finance" className={`${navBaseClass} ${financeActive ? activeNavClass : ""}`}>
              Финансы
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
