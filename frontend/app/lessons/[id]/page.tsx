"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Lesson, LessonStatus } from "@/lib/types";

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<LessonStatus>("scheduled");
  const [paidAmount, setPaidAmount] = useState(0);
  const [homeworkText, setHomeworkText] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.requestLesson(Number(params.id));
      // если api типизирован как unknown — можно временно сделать:
      // const data = (await api.requestLesson(Number(params.id))) as Lesson;

      setLesson(data as Lesson);
      setStatus((data as Lesson).status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async () => {
    await api.updateLesson(Number(params.id), { status });
    await load();
  };

  const updatePayment = async () => {
    await api.updatePayment(Number(params.id), {
      is_paid: true,
      paid_amount: paidAmount,
      paid_at: new Date().toISOString(),
    });
    await load();
  };

  const updateHomework = async () => {
    await api.updateHomework(Number(params.id), {
      text: homeworkText || null,
      link: null,
      is_sent: true,
      sent_at: new Date().toISOString(),
    });
    await load();
  };

  if (!lesson) {
    return <p className="text-sm">{error ? error : "Загрузка..."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Занятие #{lesson.id}</h1>
        <p className="text-sm text-slate-600">
          {new Date(lesson.start_at).toLocaleString()} · {lesson.duration_min} мин
        </p>
        <p className="text-sm">Тема: {lesson.topic || "Без темы"}</p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Статус</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className="rounded border px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value as LessonStatus)}
          >
            <option value="scheduled">Запланировано</option>
            <option value="done">Проведено</option>
            <option value="canceled">Отменено</option>
          </select>
          <Button onClick={updateStatus}>Обновить</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Оплата</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            className="rounded border px-3 py-2"
            type="number"
            min={0}
            value={paidAmount}
            onChange={(event) => setPaidAmount(Number(event.target.value))}
          />
          <Button onClick={updatePayment}>Отметить оплату</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Домашка</h2>
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            className="rounded border px-3 py-2"
            rows={3}
            value={homeworkText}
            onChange={(event) => setHomeworkText(event.target.value)}
          />
          <Button onClick={updateHomework}>Отправить</Button>
        </div>
      </div>
    </div>
  );
}
