"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearToken, getToken } from "@/lib/api";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";

export function AuthNav() {
  const router = useRouter();
  const { showToast } = useToast();

  const [hasToken, setHasToken] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  const handleConfirmLogout = () => {
    // Комментарий наставника: при logout чистим локальную сессию до редиректа, чтобы защищённые экраны не успели перерендериться со старым токеном.
    clearToken();
    setHasToken(false);
    setIsModalOpen(false);
    showToast("Вы вышли", "success");
    router.push("/login");
  };

  if (!hasToken) {
    return (
      <Link href="/login" className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50">
        Вход
      </Link>
    );
  }

  return (
    <>
      <button
        className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
        onClick={() => setIsModalOpen(true)}
      >
        Выход
      </button>

      <ConfirmModal
        open={isModalOpen}
        title="Выход"
        description="Вы уверены, что хотите выйти?"
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
