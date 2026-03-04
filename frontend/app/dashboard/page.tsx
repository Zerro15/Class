"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Lesson {
  id: number;
  student_id: number;
  start_at: string;
  duration_min: number;
  status: string;
  topic?: string | null;
  price: number;
  homework?: { status: "todo" | "done" } | null;
  payment?: { status: "unpaid" | "paid" } | null;
}

type LessonStatus = "scheduled" | "done" | "canceled";

export default function DashboardPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUpcoming(7);
      setItems(data.items as Lesson[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (lessonId: number, status: LessonStatus) => {
    await api.updateLesson(lessonId, { status });
    await load();
  };

  const markPaid = async (lessonId: number) => {
    await api.markPaymentPaid(lessonId);
    await load();
  };

  const markHomeworkSent = async (lessonId: number) => {
    await api.markHomeworkDone(lessonId);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ближайшие занятия (7 дней)</h1>
        {loading ? <p className="mt-4 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Нет запланированных занятий.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((lesson) => (
          <div key={lesson.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {new Date(lesson.start_at).toLocaleString()}
                </p>
                <p className="font-medium">{lesson.topic || "Без темы"}</p>
                <p className="text-xs text-slate-500">Статус: {lesson.status}</p>
                <a className="text-xs text-slate-600 hover:text-slate-900" href={`/lessons/${lesson.id}`}>
                  Открыть занятие
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(lesson.id, "done")}
                >
                  Проведено
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(lesson.id, "canceled")}
                >
                  Отменено
                </Button>
                <Button size="sm" variant="outline" onClick={() => markPaid(lesson.id)} disabled={lesson.payment?.status === "paid"}>
                  Оплачено
                </Button>
                <Button size="sm" variant="outline" onClick={() => markHomeworkSent(lesson.id)} disabled={lesson.homework?.status === "done"}>
                  Домашка отправлена
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
