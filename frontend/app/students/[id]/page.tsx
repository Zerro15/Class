"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api, type LessonItem } from "@/lib/api";

interface Student {
  id: number;
  name: string;
  notes: string | null;
}

function StudentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-12 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-24 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="mb-3 h-28 rounded-3xl bg-slate-100 last:mb-0" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function formatLessonDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [topic, setTopic] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("0");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentData, lessonsData] = await Promise.all([
        api.getStudent(params.id),
        api.listLessons({ student_id: Number(params.id) }),
      ]);
      setStudent(studentData);
      setName(studentData.name);
      setNotes(studentData.notes ?? "");
      setLessons(lessonsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить карточку ученика");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const upcomingLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => new Date(lesson.start_at).getTime() >= Date.now() && lesson.status !== "canceled")
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [lessons],
  );

  const paidLessons = useMemo(() => lessons.filter((lesson) => lesson.is_paid).length, [lessons]);

  const handleSaveStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedNotes = notes.trim();

    if (!normalizedName) {
      setError("Имя ученика обязательно");
      return;
    }

    setSavingStudent(true);
    setError(null);
    try {
      const updated = await api.updateStudent(params.id, {
        name: normalizedName,
        notes: normalizedNotes || null,
      });
      setStudent(updated);
      setName(updated.name);
      setNotes(updated.notes ?? "");
      showToast("Карточка ученика обновлена", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обновить ученика";
      setError(message);
      showToast(message, "error");
    } finally {
      setSavingStudent(false);
    }
  };

  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    const durationValue = Number(duration);
    const priceValue = Number(price);

    if (!startAt || !Number.isFinite(durationValue) || durationValue <= 0 || !Number.isFinite(priceValue) || priceValue < 0) {
      setError("Проверьте поля занятия");
      return;
    }

    setCreatingLesson(true);
    setError(null);
    try {
      await api.createLesson({
        student_id: Number(params.id),
        start_at: new Date(startAt).toISOString(),
        duration_min: durationValue,
        status: "scheduled",
        topic: topic.trim() || null,
        price: priceValue,
      });
      setTopic("");
      setStartAt("");
      setDuration("60");
      setPrice("0");
      showToast("Занятие создано", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать занятие";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteStudent(params.id);
      showToast("Ученик удален", "success");
      router.replace("/students");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось удалить ученика";
      setError(message);
      showToast(message, "error");
      setIsDeleteOpen(false);
    }
  };

  if (loading) {
    return <StudentDetailSkeleton />;
  }

  if (!student) {
    return <div className="rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">{error ?? "Ученик не найден"}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <Link href="/students" className="text-sm text-sky-200 hover:text-white">
              ← Назад к списку учеников
            </Link>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Карточка ученика</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">{student.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              В одном месте: заметки по ученику, быстрый запуск нового занятия и история уроков с оплатой.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(true)} className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/15">
                Удалить ученика
              </Button>
            </div>
          </div>
          <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {student.notes?.trim() ? student.notes : "Заметки пока не добавлены. Ниже можно быстро заполнить карточку ученика."}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Редактирование</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Данные ученика</h2>
          <form className="mt-6 space-y-4" onSubmit={handleSaveStudent}>
            <label className="block text-sm font-medium text-slate-700">
              Имя
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Заметки
              <textarea
                className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Уровень, цели, формат занятий, детали по коммуникации"
              />
            </label>
            <Button type="submit" disabled={savingStudent} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {savingStudent ? "Сохраняю..." : "Сохранить изменения"}
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Всего занятий" value={String(lessons.length)} hint="История по этому ученику" />
        <StatCard label="Впереди" value={String(upcomingLessons.length)} hint="Будущие уроки без отмены" />
        <StatCard label="Оплачено" value={String(paidLessons)} hint="Занятия с отмеченной оплатой" />
      </section>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <p className="text-sm font-medium text-sky-700">Быстрое действие</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Создать занятие</h2>
          <form className="mt-6 space-y-4" onSubmit={handleCreateLesson}>
            <label className="block text-sm font-medium text-slate-700">
              Дата и время
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Длительность, мин
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Цена
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Тема
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Например, сочинение или квадратные уравнения"
              />
            </label>
            <Button type="submit" disabled={creatingLesson} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {creatingLesson ? "Создаю..." : "Создать занятие"}
            </Button>
          </form>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-sky-700">История</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Занятия ученика</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">Список строится по всем занятиям, уже созданным для этого ученика.</p>
          </div>

          {lessons.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="text-lg font-semibold text-slate-900">Занятий пока нет</p>
              <p className="mt-2 text-sm text-slate-500">Создайте первое занятие слева, и оно сразу появится в истории.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {lessons
                .slice()
                .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
                .map((lesson) => (
                  <article key={lesson.id} className="rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{formatLessonDate(lesson.start_at)}</p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                              lesson.status === "done"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : lesson.status === "canceled"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            {lesson.status === "done" ? "Проведено" : lesson.status === "canceled" ? "Отменено" : "Запланировано"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {lesson.duration_min} мин · {lesson.price} ₽
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{lesson.topic?.trim() || "Тема не указана"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            lesson.is_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {lesson.is_paid ? "Оплачено" : "Не оплачено"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            lesson.is_homework_sent ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {lesson.is_homework_sent ? "Домашка отправлена" : "Домашка не отправлена"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={isDeleteOpen}
        title="Удалить ученика?"
        description="Это удалит карточку ученика. Продолжайте только если уверены, что запись больше не нужна."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
