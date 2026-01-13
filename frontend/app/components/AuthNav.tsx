"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tokenStorage } from "@/lib/api";

export function AuthNav() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(tokenStorage.get()));
  }, []);

  if (!hasToken) {
    return <Link href="/login" className="text-slate-600 hover:text-slate-900">Вход</Link>;
  }

  return (
    <button
      className="text-slate-600 hover:text-slate-900"
      onClick={() => {
        tokenStorage.clear();
        window.location.href = "/login";
      }}
    >
      Выйти
    </button>
  );
}
