"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/components/AuthProvider";

export function AuthNav() {
  const router = useRouter();
  const { isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return <span className="text-slate-400">...</span>;
  }

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="text-slate-600 hover:text-slate-900">
        Вход
      </Link>
    );
  }

  return (
    <button
      className="text-slate-600 hover:text-slate-900"
      onClick={() => {
        logout();
        router.push("/login");
      }}
    >
      Выйти
    </button>
  );
}
