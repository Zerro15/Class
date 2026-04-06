"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Lesson {
  id: number;
  start_at: string;
  duration_min: number;
  status: string;
  topic?: string | null;
  price: number;
  is_archived: boolean;
}

function LessonDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("scheduled");
  const [paidAmount, setPaidAmount] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingHomework, setSavingHomework] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.requestLesson(Number(params.id));
      setLesson(data);
      setStatus(data.status);
      setPaidAmount(String(data.price));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки занятия");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async () => {
    setSavingStatus(true);
    try {
      await api.updateLesson(Number(params.id), { status });
      await load();
      showToast("Статус обновлен", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обновить статус";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingStatus(false);
    }
  };

  const updatePayment = async () => {
    setSavingPayment(true);
    try {
      await api.updatePayment(Number(params.id), {
        is_paid: true,
        paid_amount: Number(paidAmount) || 0,
        paid_at: new Date().toISOString(),
      });
      showToast("Оплата отмечена", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить оплату";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingPayment(false);
    }
  };

  const updateHomework = async () => {
    setSavingHomework(true);
    try {
      await api.updateHomework(Number(params.id), {
        text: homeworkText.trim() || null,
        link: null,
        is_sent: true,
        sent_at: new Date().toISOString(),
      });
      showToast("Домашка отмечена как отправленная", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить домашку";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingHomework(false);
    }
  };

  if (loading) {
    return <LessonDetailSkeleton />;
  }

  if (!lesson) {
    return <div className="rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">{error ?? "Занятие не найдено"}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <Link href="/lessons" className="text-sm text-sky-200 hover:text-white">
              ← Назад к урокам
            </Link>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Карточка урока</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Занятие #{lesson.id}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {formatLessonDate(lesson.start_at)} · {lesson.duration_min} мин · {lesson.price} ₽
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  lesson.status === "done"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : lesson.status === "canceled"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-white/20 bg-white/10 text-white"
                }`}
              >
                {lesson.status === "done" ? "Проведено" : lesson.status === "canceled" ? "Отменено" : "Запланировано"}
              </span>
              {lesson.is_archived ? (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white">В архиве</span>
              ) : null}
            </div>
          </div>
          <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {lesson.topic?.trim() ? lesson.topic : "Тема занятия пока не указана."}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Сводка</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Быстрый контекст</h2>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Дата и время</p>
              <p className="mt-1 text-sm text-slate-500">{formatLessonDate(lesson.start_at)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Длительность</p>
              <p className="mt-1 text-sm text-slate-500">{lesson.duration_min} минут</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">Стоимость</p>
              <p className="mt-1 text-sm text-slate-500">{lesson.price} ₽</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard title="Статус" value={lesson.status} hint="Текущее состояние занятия" />
        <StatCard title="Цена" value={`${lesson.price} ₽`} hint="Базовая стоимость урока" />
        <StatCard title="Тема" value={lesson.topic?.trim() ? "Есть" : "Нет"} hint="Заполненность содержания занятия" />
      </section>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Статус</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Изменить состояние урока</h2>
          <div className="mt-6 space-y-4">
            <select
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="scheduled">Запланировано</option>
              <option value="done">Проведено</option>
              <option value="canceled">Отменено</option>
            </select>
            <Button onClick={() => void updateStatus()} disabled={savingStatus} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {savingStatus ? "Сохраняем..." : "Обновить статус"}
            </Button>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Оплата</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Отметить поступление</h2>
          <div className="mt-6 space-y-4">
            <input
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              type="number"
              min={0}
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
            />
            <Button onClick={() => void updatePayment()} disabled={savingPayment} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {savingPayment ? "Сохраняем..." : "Отметить оплату"}
            </Button>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Домашка</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Отметить отправку</h2>
          <div className="mt-6 space-y-4">
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              rows={4}
              value={homeworkText}
              onChange={(event) => setHomeworkText(event.target.value)}
              placeholder="Текст домашнего задания"
            />
            <Button onClick={() => void updateHomework()} disabled={savingHomework} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {savingHomework ? "Сохраняем..." : "Отправить домашку"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
