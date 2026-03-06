"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api, LessonItem } from "@/lib/api";

const STATUS_LABELS: Record<LessonItem["status"], string> = {
  scheduled: "Запланировано",
  done: "Проведено",
  canceled: "Отменено",
};

const MODE_OPTIONS = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "list", label: "Список" },
] as const;

type ViewMode = (typeof MODE_OPTIONS)[number]["value"];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
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
    const periodStart = new Date(from);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(to);
    periodEnd.setHours(23, 59, 59, 999);

    return allLessons
      .filter((lesson) => {
        const date = new Date(lesson.start_at);
        if (mode === "today" && date.toDateString() !== now.toDateString()) return false;
        if (mode === "week") {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() + 7);
          if (date < now || date > weekEnd) return false;
        }
        if (mode === "list" && (date < periodStart || date > periodEnd)) return false;
        if (studentFilter !== "all" && lesson.student_id !== Number(studentFilter)) return false;
        if (statusFilter !== "all" && lesson.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  }, [allLessons, from, mode, statusFilter, studentFilter, to]);

  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Уроки</h1>
        <p className="mt-1 text-sm text-slate-600">Раздел стал отдельным хабом: здесь удобно смотреть расписание по периодам, а в календаре и dashboard — планировать и управлять действиями.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link href="/dashboard" className="rounded-lg border px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">Создать занятие</Link>
          <Link href="/calendar" className="rounded-lg border px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">Открыть календарь</Link>
          <Link href="/dashboard" className="rounded-lg border px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">Открыть панель управления</Link>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setMode(option.value)}
              className={`rounded-full px-3 py-1.5 text-sm ${mode === option.value ? "bg-slate-900 text-white" : "border text-slate-700 hover:bg-slate-50"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select className="rounded border px-3 py-2 text-sm" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
            <option value="all">Все ученики</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
          <select className="rounded border px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LessonItem["status"] | "all")}>
            <option value="all">Все статусы</option>
            <option value="scheduled">Запланировано</option>
            <option value="done">Проведено</option>
            <option value="canceled">Отменено</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="rounded border px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="rounded border px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white shadow-sm">
        {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="p-4 text-sm text-slate-500">Загрузка уроков...</p> : null}

        {!loading && filteredLessons.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">По выбранным фильтрам уроков не найдено.</p>
        ) : (
          <div className="divide-y">
            {filteredLessons.map((lesson) => (
              <article key={lesson.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.7fr_0.9fr] sm:items-center">
                <div className="font-medium text-slate-900">{studentsById.get(lesson.student_id) ?? `Ученик #${lesson.student_id}`}</div>
                <div className="text-slate-700">{lesson.topic || "Без темы"}</div>
                <div className="text-slate-700">{new Date(lesson.start_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                <div className="text-slate-700">{lesson.duration_min} мин</div>
                <div className="text-slate-700">{lesson.price} ₽</div>
                <div className="text-slate-700">{STATUS_LABELS[lesson.status]}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
