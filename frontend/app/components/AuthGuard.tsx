"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/app/components/AuthProvider";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, pathname, router]);

  if (!loading && !isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    return <p className="text-sm text-slate-600">Перенаправляем на страницу входа...</p>;
  }

  return <>{children}</>;
}
