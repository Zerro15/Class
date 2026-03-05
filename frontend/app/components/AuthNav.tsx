"use client";

import Link from "next/link";
import { useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { useSession } from "@/app/components/SessionProvider";
import { useUnsavedChanges } from "@/app/components/UnsavedChangesProvider";

export function AuthNav() {
  const { showToast } = useToast();
  const { isAuthenticated, logout } = useSession();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  const startLogout = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedModalOpen(true);
      return;
    }
    setIsLogoutModalOpen(true);
  };

  const finishLogout = () => {
    setHasUnsavedChanges(false);
    setIsLogoutModalOpen(false);
    setIsUnsavedModalOpen(false);
    logout();
    showToast("Вы вышли", "success");
  };

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="text-slate-600 transition-colors hover:text-slate-900">
        Вход
      </Link>
    );
  }

  return (
    <>
      <button className="text-slate-600 transition-colors hover:text-slate-900" onClick={startLogout}>
        Выйти
      </button>

      <ConfirmModal
        open={isUnsavedModalOpen}
        title="Несохраненные изменения"
        description="У вас есть несохранённые изменения. Выйти без сохранения?"
        confirmText="Выйти без сохранения"
        cancelText="Отмена"
        onConfirm={() => {
          setIsUnsavedModalOpen(false);
          setIsLogoutModalOpen(true);
        }}
        onCancel={() => setIsUnsavedModalOpen(false)}
      />

      <ConfirmModal
        open={isLogoutModalOpen}
        title="Подтверждение выхода"
        description="Вы уверены, что хотите выйти?"
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={finishLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}
