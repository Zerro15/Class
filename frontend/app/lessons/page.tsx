"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, type LessonItem } from "@/lib/api";

const STATUS_LABELS: Record<LessonItem["status"], string> = {
  scheduled: "Запланировано",
  done: "Проведено",
  canceled: "Отменено",
};

const MODE_OPTIONS = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "list", label: "Диапазон" },
] as const;

type ViewMode = (typeof MODE_OPTIONS)[number]["value"];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
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

function LessonsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-6 flex gap-3">
            <div className="h-12 w-36 rounded-2xl bg-slate-100" />
            <div className="h-12 w-40 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function LessonListCard({ lesson, studentName }: { lesson: LessonItem; studentName: string }) {
  return (
    <article className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-slate-900">{studentName}</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                lesson.status === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : lesson.status === "canceled"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {STATUS_LABELS[lesson.status]}
            </span>
            {lesson.series_id ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">Постоянное</span>
            ) : null}
            {lesson.is_paid ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Оплачено</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-600">{formatLessonDate(lesson.start_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{lesson.duration_min} мин</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{lesson.price} ₽</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              {lesson.is_homework_sent ? "Домашка отправлена" : "Домашка не отправлена"}
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {lesson.topic?.trim() ? lesson.topic : "Тема занятия пока не указана."}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function LessonsPage() {
  const [allLessons, setAllLessons] = useState<LessonItem[]>([]);
  const [students, setStudents] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("week");
  const [studentFilter, setStudentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LessonItem["status"] | "all">("all");
  const [from, setFrom] = useState(() => toDateInputValue(new Date()));
  const [to, setTo] = useState(() => toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 31);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lessons, studentList] = await Promise.all([
          api.listLessons({ from: start.toISOString(), to: end.toISOString() }),
          api.listStudents(),
        ]);
        setAllLessons(lessons);
        setStudents(studentList.map((student) => ({ id: student.id, name: student.name })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить уроки");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredLessons = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(from);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(to);
    periodEnd.setHours(23, 59, 59, 999);

    return allLessons
      .filter((lesson) => {
        const date = new Date(lesson.start_at);
        if (mode === "today" && (date < todayStart || date > todayEnd)) return false;
        if (mode === "week" && (date < todayStart || date > weekEnd)) return false;
        if (mode === "list" && (date < periodStart || date > periodEnd)) return false;
        if (studentFilter !== "all" && lesson.student_id !== Number(studentFilter)) return false;
        if (statusFilter !== "all" && lesson.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [allLessons, from, mode, statusFilter, studentFilter, to]);

  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students]);

  const summary = useMemo(() => {
    return {
      total: filteredLessons.length,
      scheduled: filteredLessons.filter((lesson) => lesson.status === "scheduled").length,
      done: filteredLessons.filter((lesson) => lesson.status === "done").length,
      canceled: filteredLessons.filter((lesson) => lesson.status === "canceled").length,
    };
  }, [filteredLessons]);

  if (loading) {
    return <LessonsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Уроки</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Отдельный хаб для просмотра всех занятий</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Смотрите уроки по дню, неделе или произвольному диапазону, фильтруйте по ученикам и статусам и быстро переходите к планированию.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button className="h-12 rounded-2xl bg-sky-500 px-5 text-white hover:bg-sky-400">Создать занятие</Button>
              </Link>
              <Link href="/calendar">
                <Button variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/15">
                  Открыть календарь
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-sky-700">Быстрая навигация</p>
          <div className="mt-4 space-y-3">
            {[
              { href: "/calendar", label: "Перейти в календарь", hint: "Для визуального планирования и переноса уроков" },
              { href: "/dashboard", label: "Открыть панель управления", hint: "Для быстрых действий по ближайшим занятиям" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">{item.hint}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  mode === option.value ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <select className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="all">Все ученики</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <select
              className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LessonItem["status"] | "all")}
            >
              <option value="all">Все статусы</option>
              <option value="scheduled">Запланировано</option>
              <option value="done">Проведено</option>
              <option value="canceled">Отменено</option>
            </select>
            <input type="date" className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={from} onChange={(event) => setFrom(event.target.value)} />
            <input type="date" className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Всего в выборке" value={String(summary.total)} hint="После всех фильтров" />
        <StatCard title="Запланировано" value={String(summary.scheduled)} hint="Актуальные будущие уроки" />
        <StatCard title="Проведено" value={String(summary.done)} hint="Завершенные занятия" />
        <StatCard title="Отменено" value={String(summary.canceled)} hint="Не состоявшиеся уроки" />
      </section>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Список</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Подходящие уроки</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Отфильтрованный список помогает быстро просмотреть нагрузку по периодам без переключения в календарный режим.
          </p>
        </div>

        {filteredLessons.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">По выбранным фильтрам уроков не найдено</p>
            <p className="mt-2 text-sm text-slate-500">Измените период, ученика или статус, чтобы увидеть занятия.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredLessons.map((lesson) => (
              <LessonListCard
                key={lesson.id}
                lesson={lesson}
                studentName={studentsById.get(lesson.student_id) ?? `Ученик #${lesson.student_id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
