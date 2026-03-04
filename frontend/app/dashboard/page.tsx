"use client";

import { useEffect, useState } from "react";

import { api, lessonStatusLabel, paymentStatusLabel, homeworkStatusLabel, type Lesson, type LessonStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useToast } from "@/app/components/ToastProvider";

export default function DashboardPage() {
  const { showToast } = useToast();
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
      const [upcoming, historyData] = await Promise.all([
        api.getUpcoming(7),
        api.getHistory(20, historyFilter === "all" ? undefined : historyFilter),
      ]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось обновить статус", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ближайшие занятия (7 дней)</h1>
        {loading ? <p className="mt-4 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && items.length === 0 ? <p className="mt-4 text-sm text-slate-600">Нет запланированных занятий.</p> : null}
      </div>

      <div className="space-y-3">
        {items.map((lesson) => (
          <div key={lesson.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
                <p className="font-medium">{lesson.topic || "Без темы"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge label={lessonStatusLabel[lesson.status]} />
                  {lesson.homework ? <StatusBadge label={`Домашка: ${homeworkStatusLabel[lesson.homework.status]}`} tone="warning" /> : null}
                  {lesson.payment ? <StatusBadge label={`Оплата: ${paymentStatusLabel[lesson.payment.status]}`} tone={lesson.payment.status === "paid" ? "success" : "danger"} /> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => changeStatus(lesson.id, "completed")} disabled={busyId === lesson.id}>Проведён</Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus(lesson.id, "canceled")} disabled={busyId === lesson.id}>Отменён</Button>
                <a className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-sm" href={`/lessons/${lesson.id}`}>
                  Открыть
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">История занятий</h2>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={historyFilter}
            onChange={(event) => setHistoryFilter(event.target.value as "all" | LessonStatus)}
          >
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
