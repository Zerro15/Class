"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, type FinanceFilters } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Student {
  id: number;
  name: string;
}

interface FinanceItem {
  lesson_id: number;
  student_id: number;
  student_name: string;
  start_at: string;
  status: string;
  topic: string | null;
  price: number;
  is_archived: boolean;
  is_paid: boolean;
  paid_amount: number;
  paid_at: string | null;
  is_transferred: boolean;
  transferred_amount: number;
  transferred_at: string | null;
}

export default function FinancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [summary, setSummary] = useState({ income_paid: 0, debt_unpaid: 0, transferred_sum: 0, not_transferred_sum: 0, lessons_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [studentId, setStudentId] = useState("");
  const [paid, setPaid] = useState("all");
  const [transferred, setTransferred] = useState("all");
  const [archived, setArchived] = useState("false");

  const filters = useMemo<FinanceFilters>(() => ({
    from: from || undefined,
    to: to || undefined,
    student_id: studentId ? Number(studentId) : undefined,
    paid: paid === "all" ? undefined : paid === "true",
    transferred: transferred === "all" ? undefined : transferred === "true",
    archived: archived === "all" ? undefined : archived === "true",
  }), [from, to, studentId, paid, transferred, archived]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, itemsData, summaryData] = await Promise.all([
        api.listStudents(),
        api.financeItems(filters),
        api.financeSummary(filters),
      ]);
      setStudents(studentsData);
      setItems(itemsData.items);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сервера. Попробуйте позже");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePaid = async (item: FinanceItem) => {
    await api.updatePayment(item.lesson_id, {
      is_paid: !item.is_paid,
      paid_amount: !item.is_paid ? item.price : 0,
      paid_at: !item.is_paid ? new Date().toISOString() : null,
      is_transferred: item.is_transferred && !item.is_paid ? item.is_transferred : false,
      transferred_amount: item.is_transferred && !item.is_paid ? item.transferred_amount : 0,
      transferred_at: item.is_transferred && !item.is_paid ? item.transferred_at : null,
    });
    await load();
  };

  const toggleTransferred = async (item: FinanceItem) => {
    await api.updatePayment(item.lesson_id, {
      is_paid: item.is_paid,
      paid_amount: item.paid_amount,
      paid_at: item.paid_at,
      is_transferred: !item.is_transferred,
      transferred_amount: !item.is_transferred ? (item.paid_amount || item.price) : 0,
      transferred_at: !item.is_transferred ? new Date().toISOString() : null,
    });
    await load();
  };

  const toggleArchive = async (item: FinanceItem) => {
    await api.updateLesson(item.lesson_id, { is_archived: !item.is_archived });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Финансы</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <input type="date" className="rounded border px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded border px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="rounded border px-3 py-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Все ученики</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <select className="rounded border px-3 py-2" value={paid} onChange={(e) => setPaid(e.target.value)}>
            <option value="all">Оплата: все</option>
            <option value="true">Только оплачено</option>
            <option value="false">Только не оплачено</option>
          </select>
          <select className="rounded border px-3 py-2" value={transferred} onChange={(e) => setTransferred(e.target.value)}>
            <option value="all">Перевод: все</option>
            <option value="true">Только переведено</option>
            <option value="false">Только не переведено</option>
          </select>
          <select className="rounded border px-3 py-2" value={archived} onChange={(e) => setArchived(e.target.value)}>
            <option value="all">Архив: все</option>
            <option value="false">Только активные</option>
            <option value="true">Только архив</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard title="Оплачено" value={summary.income_paid} />
        <StatCard title="Долг" value={summary.debt_unpaid} />
        <StatCard title="Переведено" value={summary.transferred_sum} />
        <StatCard title="Не переведено" value={summary.not_transferred_sum} />
        <StatCard title="Кол-во занятий" value={summary.lessons_count} isMoney={false} />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Список занятий</h2>
        {loading ? <p className="mt-3 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {!loading && !error && items.length === 0 ? <p className="mt-3 text-sm text-slate-600">По выбранным фильтрам данных нет.</p> : null}

        {!loading && !error && items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">Дата</th>
                  <th className="py-2 pr-4">Ученик</th>
                  <th className="py-2 pr-4">Тема</th>
                  <th className="py-2 pr-4">Сумма</th>
                  <th className="py-2 pr-4">Оплата</th>
                  <th className="py-2 pr-4">Перевод</th>
                  <th className="py-2 pr-4">Архив</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.lesson_id} className="border-b align-top">
                    <td className="py-3 pr-4">{new Date(item.start_at).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{item.student_name}</td>
                    <td className="py-3 pr-4">{item.topic || "Без темы"}</td>
                    <td className="py-3 pr-4">{item.price}</td>
                    <td className="py-3 pr-4">
                      <Button variant="outline" size="sm" onClick={() => togglePaid(item)}>
                        {item.is_paid ? "Снять оплату" : "Отметить оплачено"}
                      </Button>
                    </td>
                    <td className="py-3 pr-4">
                      <Button variant="outline" size="sm" onClick={() => toggleTransferred(item)} disabled={!item.is_paid && !item.is_transferred}>
                        {item.is_transferred ? "Снять перевод" : "Отметить переведено"}
                      </Button>
                    </td>
                    <td className="py-3 pr-4">
                      <Button variant="outline" size="sm" onClick={() => toggleArchive(item)}>
                        {item.is_archived ? "Из архива" : "В архив"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ title, value, isMoney = true }: { title: string; value: number; isMoney?: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold">{isMoney ? `${value.toFixed(2)} ₽` : value}</p>
    </div>
  );
}
