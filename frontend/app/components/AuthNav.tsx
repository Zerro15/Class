"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { clearToken, getToken } from "@/lib/api";

export function AuthNav() {
  const router = useRouter();
  const { showToast } = useToast();

  const [hasToken, setHasToken] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  const handleConfirmLogout = () => {
    clearToken();
    setHasToken(false);
    setIsModalOpen(false);
    showToast("Вы вышли", "success");
    router.push("/login");
  };

  if (!hasToken) {
    return (
      <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        Вход
      </Link>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="default"
        className="text-sm font-normal text-slate-600 hover:text-slate-900"
        onClick={() => setIsModalOpen(true)}
      >
        Выход
      </Button>

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
