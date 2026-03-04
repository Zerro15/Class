"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { tokenStorage } from "@/lib/api";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";

export function AuthNav() {
  const router = useRouter();
  const { showToast } = useToast();

  const [hasToken, setHasToken] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(tokenStorage.get()));
  }, []);

  const handleConfirmLogout = () => {
    tokenStorage.clear();
    setHasToken(false);
    setIsModalOpen(false);
    showToast("Вы вышли", "success");
    router.push("/login");
  };

  if (!hasToken) {
    return (
      <Link href="/login" className="text-slate-600 transition-colors hover:text-slate-900">
        Вход
      </Link>
    );
  }

  return (
    <>
      <button
        className="text-slate-600 transition-colors hover:text-slate-900"
        onClick={() => setIsModalOpen(true)}
      >
        Выйти
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
