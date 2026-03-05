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
      <Link href="/login" className="rounded-sm bg-yellow-400 px-4 py-2 font-semibold text-slate-900 shadow">
        Вход
      </Link>
    );
  }

  return (
    <>
      <button
        className="rounded-sm bg-yellow-400 px-4 py-2 font-semibold text-slate-900 shadow"
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
