"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api, ApiError, clearToken, getToken, isAuthRoute, subscribeToSessionChange } from "@/lib/api";

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
  const isAuthPage = isAuthRoute(pathname);
  const [checkingSession, setCheckingSession] = useState(!isAuthPage);
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      if (isAuthPage) {
        if (!cancelled) {
          setCheckingSession(false);
          setProfileEmail("");
        }
        return;
      }

      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setProfileEmail("");
          setCheckingSession(false);
          router.replace("/login");
        }
        return;
      }

      if (!cancelled) {
        setCheckingSession(true);
      }

      try {
        const me = await api.me();
        if (!cancelled) {
          setProfileEmail(me.email);
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          if (!cancelled) {
            setProfileEmail("");
            showToast("Сессия истекла. Войдите снова", "error");
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    };

    void ensureSession();

    const unsubscribe = subscribeToSessionChange(() => {
      void ensureSession();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthPage, router, showToast]);

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
    setProfileEmail("");
    showToast("Вы вышли", "success");
    setIsLogoutOpen(false);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/70 bg-white/80 p-5 backdrop-blur lg:flex lg:flex-col">
          <Link href="/dashboard" className="mb-6">
            <span className="block text-xs font-medium uppercase tracking-[0.24em] text-sky-600">ClassFlow</span>
            <span className="mt-1 block text-lg font-semibold text-slate-900">Панель преподавателя</span>
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
          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs text-slate-500">Вы вошли как</p>
            <p className="truncate text-sm font-medium text-slate-800">{profileEmail || "Пользователь"}</p>
            <Button className="mt-3 w-full" variant="outline" onClick={() => setIsLogoutOpen(true)}>
              Выход
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-sky-600">ClassFlow</p>
                <p className="text-base font-semibold text-slate-900">Панель преподавателя</p>
              </div>
              <Button variant="ghost" onClick={() => setIsLogoutOpen(true)}>
                Выход
              </Button>
            </div>
            <nav className="mt-3 flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-xs ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
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
