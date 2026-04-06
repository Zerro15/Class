"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api, type FinanceFilters } from "@/lib/api";

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

function formatCurrency(value: number) {
  return `${value.toFixed(2)} ₽`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, hint, tone = "default" }: { title: string; value: string; hint: string; tone?: "default" | "accent" }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone === "accent" ? "border-sky-200 bg-sky-50/80" : "border-slate-200 bg-white/90"}`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function FinanceItemCard({
  item,
  busy,
  onTogglePaid,
  onToggleTransferred,
  onToggleArchive,
}: {
  item: FinanceItem;
  busy: boolean;
  onTogglePaid: () => void;
  onToggleTransferred: () => void;
  onToggleArchive: () => void;
}) {
  return (
    <article className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-slate-900">{item.student_name}</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                item.is_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {item.is_paid ? "Оплачено" : "Ожидает оплаты"}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                item.is_transferred ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {item.is_transferred ? "Переведено" : "Не переведено"}
            </span>
            {item.is_archived ? (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">В архиве</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-600">{formatDate(item.start_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              Стоимость: {formatCurrency(item.price)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              Оплачено: {formatCurrency(item.paid_amount)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              Переведено: {formatCurrency(item.transferred_amount)}
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {item.topic?.trim() ? item.topic : "Тема занятия не указана."}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[300px] lg:justify-end">
          <Button variant="outline" size="sm" onClick={onTogglePaid} disabled={busy} className="rounded-2xl">
            {item.is_paid ? "Снять оплату" : "Отметить оплачено"}
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleTransferred} disabled={busy || (!item.is_paid && !item.is_transferred)} className="rounded-2xl">
            {item.is_transferred ? "Снять перевод" : "Отметить переведено"}
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleArchive} disabled={busy} className="rounded-2xl">
            {item.is_archived ? "Из архива" : "В архив"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function FinancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [summary, setSummary] = useState({
    income_paid: 0,
    debt_unpaid: 0,
    transferred_sum: 0,
    not_transferred_sum: 0,
    lessons_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [studentId, setStudentId] = useState("");
  const [paid, setPaid] = useState("all");
  const [transferred, setTransferred] = useState("all");
  const [archived, setArchived] = useState("false");

  const { showToast } = useToast();

  const filters = useMemo<FinanceFilters>(
    () => ({
      from: from || undefined,
      to: to || undefined,
      student_id: studentId ? Number(studentId) : undefined,
      paid: paid === "all" ? undefined : paid === "true",
      transferred: transferred === "all" ? undefined : transferred === "true",
      archived: archived === "all" ? undefined : archived === "true",
    }),
    [from, to, studentId, paid, transferred, archived],
  );

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
    void load();
  }, [load]);

  const resetFilters = () => {
    setFrom("");
    setTo("");
    setStudentId("");
    setPaid("all");
    setTransferred("all");
    setArchived("false");
  };

  const safeItemAction = async (lessonId: number, action: () => Promise<void>, successMessage: string) => {
    setActionBusyId(lessonId);
    try {
      await action();
      showToast(successMessage, "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обновить финансовую запись";
      setError(message);
      showToast(message, "error");
    } finally {
      setActionBusyId(null);
    }
  };

  const togglePaid = async (item: FinanceItem) => {
    await safeItemAction(
      item.lesson_id,
      async () => {
        await api.updatePayment(item.lesson_id, {
          is_paid: !item.is_paid,
          paid_amount: !item.is_paid ? item.price : 0,
          paid_at: !item.is_paid ? new Date().toISOString() : null,
          is_transferred: item.is_transferred && !item.is_paid ? item.is_transferred : false,
          transferred_amount: item.is_transferred && !item.is_paid ? item.transferred_amount : 0,
          transferred_at: item.is_transferred && !item.is_paid ? item.transferred_at : null,
        });
      },
      item.is_paid ? "Оплата снята" : "Оплата отмечена",
    );
  };

  const toggleTransferred = async (item: FinanceItem) => {
    await safeItemAction(
      item.lesson_id,
      async () => {
        await api.updatePayment(item.lesson_id, {
          is_paid: item.is_paid,
          paid_amount: item.paid_amount,
          paid_at: item.paid_at,
          is_transferred: !item.is_transferred,
          transferred_amount: !item.is_transferred ? item.paid_amount || item.price : 0,
          transferred_at: !item.is_transferred ? new Date().toISOString() : null,
        });
      },
      item.is_transferred ? "Перевод снят" : "Перевод отмечен",
    );
  };

  const toggleArchive = async (item: FinanceItem) => {
    await safeItemAction(
      item.lesson_id,
      async () => {
        await api.updateLesson(item.lesson_id, { is_archived: !item.is_archived });
      },
      item.is_archived ? "Запись возвращена из архива" : "Запись отправлена в архив",
    );
  };

  if (loading) {
    return <FinanceSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Финансы</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Оплата, переводы и архив без ручных таблиц</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Отфильтруйте занятия по ученику и статусу, быстро отмечайте оплату и переводы и держите финансовую картину под рукой.
            </p>
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              <input
                type="date"
                className="h-12 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-300"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <input
                type="date"
                className="h-12 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-300"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
              <select
                className="h-12 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                <option value="" className="text-slate-900">
                  Все ученики
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id} className="text-slate-900">
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
            <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
              <select className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={paid} onChange={(event) => setPaid(event.target.value)}>
                <option value="all">Оплата: все</option>
                <option value="true">Только оплачено</option>
                <option value="false">Только не оплачено</option>
              </select>
              <select className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={transferred} onChange={(event) => setTransferred(event.target.value)}>
                <option value="all">Перевод: все</option>
                <option value="true">Только переведено</option>
                <option value="false">Только не переведено</option>
              </select>
              <select className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={archived} onChange={(event) => setArchived(event.target.value)}>
                <option value="all">Архив: все</option>
                <option value="false">Только активные</option>
                <option value="true">Только архив</option>
              </select>
              <Button variant="outline" onClick={resetFilters} className="h-12 rounded-2xl">
                Сбросить фильтры
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-sky-700">Подсказка</p>
          <div className="mt-4 space-y-3">
            {[
              "Сначала отмечайте оплату, затем при необходимости фиксируйте перевод.",
              "Архивируйте старые записи, чтобы активный список оставался коротким.",
              "Фильтры помогают быстро видеть долг, уже полученные деньги и суммы к переводу.",
            ].map((point) => (
              <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                <p className="text-sm leading-6 text-slate-600">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Оплачено" value={formatCurrency(summary.income_paid)} hint="Сумма оплаченных занятий" tone="accent" />
        <StatCard title="Долг" value={formatCurrency(summary.debt_unpaid)} hint="Неоплаченные занятия" />
        <StatCard title="Переведено" value={formatCurrency(summary.transferred_sum)} hint="Отмечено как переведенное" />
        <StatCard title="Не переведено" value={formatCurrency(summary.not_transferred_sum)} hint="Оплачено, но еще не переведено" />
        <StatCard title="Занятий" value={String(summary.lessons_count)} hint="Всего в выборке" />
      </section>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Записи</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Финансовые занятия</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Выборка по текущим фильтрам. Каждую запись можно обновить прямо здесь, без переходов между страницами.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">По выбранным фильтрам ничего не найдено</p>
            <p className="mt-2 text-sm text-slate-500">Измените период, ученика или статусы, чтобы увидеть записи.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <FinanceItemCard
                key={item.lesson_id}
                item={item}
                busy={actionBusyId === item.lesson_id}
                onTogglePaid={() => void togglePaid(item)}
                onToggleTransferred={() => void toggleTransferred(item)}
                onToggleArchive={() => void toggleArchive(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
