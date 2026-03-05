"use client";

import { useEffect, useState } from "react";

import {
  api,
  lessonStatusLabel,
  paymentStatusLabel,
  homeworkStatusLabel,
  type DashboardSummary,
  type Lesson,
  type LessonStatus,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useToast } from "@/app/components/ToastProvider";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [items, setItems] = useState<Lesson[]>([]);
  const [history, setHistory] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | LessonStatus>("all");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, upcoming, historyData] = await Promise.all([
        api.getDashboardSummary(),
        api.getUpcoming(7),
        api.getHistory(20, historyFilter === "all" ? undefined : historyFilter),
      ]);
      setSummary(summaryData);
      setItems(upcoming.items);
      setHistory(historyData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [historyFilter]);

  const changeStatus = async (lessonId: number, status: LessonStatus) => {
    setBusyId(lessonId);
    try {
      await api.updateLesson(lessonId, { status });
      showToast("Статус урока обновлён");
      await load();
    } catch {
      showToast("Не удалось обновить статус", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (lesson: Lesson) => {
    const next = window.prompt("Введите новую дату и время (YYYY-MM-DDTHH:mm)", lesson.start_at.slice(0, 16));
    if (!next) return;
    try {
      await api.rescheduleLesson(lesson.id, {
        new_start_at: new Date(next).toISOString(),
        notify_student: false,
      });
      showToast("Занятие перенесено");
      await load();
    } catch {
      showToast("Не удалось перенести занятие", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Предстоящие уроки (7 дней)</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.upcoming_count ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Уроки сегодня</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.today_count ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Неоплаченная сумма</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{(summary?.unpaid_total ?? 0).toFixed(2)} ₽</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Предстоящие уроки</h1>
        {loading ? <p className="mt-4 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 space-y-3">
          {items.map((lesson) => {
            const debt = Math.max(0, (lesson.payment?.amount ?? lesson.price) - (lesson.payment?.paid_amount ?? 0));
            return (
              <div key={lesson.id} className="rounded border p-3">
                <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
                <p className="font-medium">{lesson.topic || "Без темы"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge label={lessonStatusLabel[lesson.status]} />
                  {lesson.homework ? <StatusBadge label={`Домашка: ${homeworkStatusLabel[lesson.homework.status]}`} tone="warning" /> : null}
                  {lesson.payment ? <StatusBadge label={`Оплата: ${paymentStatusLabel[lesson.payment.status]}`} tone={lesson.payment.status === "paid" ? "success" : "danger"} /> : null}
                </div>
                {debt > 0 ? <p className="mt-2 text-xs text-red-600">Долг: {debt.toFixed(2)} ₽</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="inline-flex h-8 items-center rounded border border-slate-300 px-3 text-sm" href={`/lessons/${lesson.id}`}>Детали</a>
                  <Button size="sm" variant="outline" onClick={() => handleReschedule(lesson)} disabled={busyId === lesson.id}>Перенести</Button>
                  <Button size="sm" variant="outline" onClick={() => changeStatus(lesson.id, "completed")} disabled={busyId === lesson.id}>Проведён</Button>
                  <Button size="sm" variant="outline" onClick={() => changeStatus(lesson.id, "canceled")} disabled={busyId === lesson.id}>Отменён</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">История занятий</h2>
          <select className="rounded border px-3 py-2 text-sm" value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as "all" | LessonStatus)}>
            <option value="all">Все статусы</option>
            <option value="completed">Проведённые</option>
            <option value="canceled">Отменённые</option>
            <option value="rescheduled">Перенесённые</option>
            <option value="no_show">Неявки</option>
          </select>
        </div>
        <ul className="mt-4 space-y-2">
          {history.map((lesson) => (
            <li key={lesson.id} className="flex items-center justify-between rounded border px-3 py-2">
              <span className="text-sm">{new Date(lesson.start_at).toLocaleString()} · {lesson.topic || "Без темы"}</span>
              <StatusBadge label={lessonStatusLabel[lesson.status]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
