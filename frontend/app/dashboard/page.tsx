"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Lesson {
  id: number;
  student_id: number;
  start_at: string;
  duration_min: number;
  status: "scheduled" | "done" | "canceled";
  topic?: string | null;
  price: number;
  is_paid?: boolean | null;
  is_homework_sent?: boolean | null;
}

const STATUS_LABELS: Record<Lesson["status"], string> = {
  scheduled: "Запланировано",
  done: "Проведено",
  canceled: "Отменено",
};

const badgeBase = "rounded-full border px-2.5 py-1 text-xs font-medium";

export default function DashboardPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUpcoming(7);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки занятий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const safeAction = async (lessonId: number, fn: () => Promise<void>) => {
    setActionError(null);
    setSavingLessonId(lessonId);
    try {
      await fn();
      await load();
    } catch (err) {
      console.error("Ошибка действия на дашборде", err);
      setActionError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    } finally {
      setSavingLessonId(null);
    }
  };

  const updateStatus = async (lessonId: number, status: Lesson["status"]) => {
    await safeAction(lessonId, async () => {
      await api.updateLesson(lessonId, { status });
    });
  };

  const markPaid = async (lesson: Lesson) => {
    await safeAction(lesson.id, async () => {
      await api.updatePayment(lesson.id, {
        is_paid: true,
        paid_amount: lesson.price > 0 ? lesson.price : 0,
        paid_at: new Date().toISOString(),
      });
    });
  };

  const markHomeworkSent = async (lesson: Lesson) => {
    await safeAction(lesson.id, async () => {
      await api.updateHomework(lesson.id, {
        text: null,
        link: null,
        is_sent: true,
        sent_at: new Date().toISOString(),
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ближайшие занятия (7 дней)</h1>
        {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}
        {loading ? <p className="mt-4 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Нет запланированных занятий.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((lesson) => {
          const saving = savingLessonId === lesson.id;
          return (
            <div key={lesson.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
                  <p className="font-medium">{lesson.topic || "Без темы"}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`${badgeBase} border-slate-300 bg-slate-50 text-slate-700`}>
                      Статус: {STATUS_LABELS[lesson.status]}
                    </span>
                    {lesson.is_paid !== undefined && lesson.is_paid !== null ? (
                      <span
                        className={`${badgeBase} ${lesson.is_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                      >
                        Оплата: {lesson.is_paid ? "оплачено" : "не оплачено"}
                      </span>
                    ) : null}
                    {lesson.is_homework_sent !== undefined && lesson.is_homework_sent !== null ? (
                      <span
                        className={`${badgeBase} ${lesson.is_homework_sent ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-slate-50 text-slate-700"}`}
                      >
                        Домашка: {lesson.is_homework_sent ? "отправлена" : "не отправлена"}
                      </span>
                    ) : null}
                  </div>
                  <a className="text-xs text-slate-600 hover:text-slate-900" href={`/lessons/${lesson.id}`}>
                    Открыть занятие
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="default" variant="outline" disabled={saving} onClick={() => void updateStatus(lesson.id, "done")}>
                    {saving ? "Сохраняю..." : "Проведено"}
                  </Button>
                  <Button size="default" variant="outline" disabled={saving} onClick={() => void updateStatus(lesson.id, "canceled")}>
                    {saving ? "Сохраняю..." : "Отменено"}
                  </Button>
                  <Button size="default" disabled={saving} onClick={() => void markPaid(lesson)}>
                    {saving ? "Сохраняю..." : "Оплачено"}
                  </Button>
                  <Button size="default" variant="outline" disabled={saving} onClick={() => void markHomeworkSent(lesson)}>
                    {saving ? "Сохраняю..." : "Домашка отправлена"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
