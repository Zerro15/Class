"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api, ApiError, clearToken, getToken } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Панель управления" },
  { href: "/students", label: "Ученики" },
  { href: "/calendar", label: "Календарь" },
  { href: "/lessons", label: "Уроки" },
  { href: "/finance", label: "Финансы" },
  { href: "/settings", label: "Настройки" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const [checkingSession, setCheckingSession] = useState(!isAuthPage);
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

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
        const me = await api.me();
        setProfileEmail(me.email);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          router.replace("/login");
        }
      } finally {
        setCheckingSession(false);
      }
    };

    void ensureSession();
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  if (checkingSession) {
    return <main className="px-4 py-8 text-center text-sm text-slate-500">Проверяем сессию...</main>;
  }

  const navBaseClass = "flex items-center rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
  const activeNavClass = "bg-slate-100 font-medium text-slate-900";

  const onLogout = () => {
    clearToken();
    showToast("Вы вышли", "success");
    setIsLogoutOpen(false);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Комментарий наставника: sidebar остаётся всегда видимым на desktop, чтобы навигация ощущалась как полноценный рабочий инструмент. */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-white p-4 lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-6 text-lg font-semibold text-slate-900">
            ClassFlow
          </Link>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`${navBaseClass} ${isActive ? activeNavClass : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl border bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Вы вошли как</p>
            <p className="truncate text-sm font-medium text-slate-800">{profileEmail || "Пользователь"}</p>
            <Button className="mt-3 w-full" variant="outline" onClick={() => setIsLogoutOpen(true)}>
              Выход
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">ClassFlow</p>
              <Button variant="ghost" onClick={() => setIsLogoutOpen(true)}>
                Выход
              </Button>
            </div>
            <nav className="mt-3 flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-1.5 text-xs ${pathname.startsWith(item.href) ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>

      <ConfirmModal
        open={isLogoutOpen}
        title="Выход"
        description="Вы уверены, что хотите выйти?"
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={onLogout}
        onCancel={() => setIsLogoutOpen(false)}
      />
    </div>
  );
}
