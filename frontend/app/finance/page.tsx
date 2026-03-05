"use client";

import { useEffect, useState } from "react";

import { api, type FinanceSummary } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

export default function FinancePage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const summary = await api.getFinanceSummary(month);
      setData(summary);
    } catch {
      showToast("Не удалось загрузить финансы", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Финансы</h1>
          <label className="text-sm">
            Месяц
            <input className="ml-2 rounded border px-2 py-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded border bg-emerald-50 p-4">
            <p className="text-xs text-slate-600">Доходы за месяц</p>
            <p className="text-2xl font-semibold text-emerald-700">{(data?.income_month ?? 0).toFixed(2)} ₽</p>
          </div>
          <div className="rounded border bg-red-50 p-4">
            <p className="text-xs text-slate-600">Неоплаченные уроки</p>
            <p className="text-2xl font-semibold text-red-700">{(data?.unpaid_total ?? 0).toFixed(2)} ₽</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Платежи</h2>
        {loading ? <p className="mt-3 text-sm">Загрузка...</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2">Дата</th>
                <th className="px-2 py-2">Ученик</th>
                <th className="px-2 py-2">Сумма</th>
                <th className="px-2 py-2">Метод</th>
                <th className="px-2 py-2">Урок</th>
                <th className="px-2 py-2">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments ?? []).map((payment) => (
                <tr key={payment.id} className="border-b">
                  <td className="px-2 py-2">{new Date(payment.paid_at).toLocaleString()}</td>
                  <td className="px-2 py-2">{payment.student_name ?? `#${payment.student_id}`}</td>
                  <td className="px-2 py-2">{payment.amount.toFixed(2)} ₽</td>
                  <td className="px-2 py-2">{payment.method}</td>
                  <td className="px-2 py-2">{payment.lesson_id ? `#${payment.lesson_id}` : "—"}</td>
                  <td className="px-2 py-2">{payment.comment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
