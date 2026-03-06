"use client";

import type { CSSProperties } from "react";

import { ChevronLeft, ChevronRight, Menu, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CalendarViewMode, formatDayHeader, minuteToLabel } from "@/lib/calendar";

const FILTER_ITEMS = [
  { key: "all", label: "Все занятия" },
  { key: "scheduled", label: "Запланированные" },
  { key: "done", label: "Проведённые" },
  { key: "canceled", label: "Отменённые" },
] as const;

export type LessonFilter = (typeof FILTER_ITEMS)[number]["key"];

export function CalendarToolbar({
  title,
  viewMode,
  onViewMode,
  onPrev,
  onNext,
  onToday,
  onToggleSidebar,
  onCreate,
}: {
  title: string;
  viewMode: CalendarViewMode;
  onViewMode: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleSidebar: () => void;
  onCreate: () => void;
}) {
  const modes: Array<{ value: CalendarViewMode; label: string }> = [
    { value: "day", label: "День" },
    { value: "3days", label: "3 дня" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
  ];

  return (
    <div className="sticky top-0 z-30 rounded-xl border bg-white/95 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onToggleSidebar} aria-label="Показать или скрыть календарную панель" className="h-9 w-9 px-0">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={onPrev} aria-label="Назад" className="h-9 w-9 px-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onToday}>Сегодня</Button>
            <Button variant="outline" onClick={onNext} aria-label="Вперёд" className="h-9 w-9 px-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-lg border bg-slate-50 p-1 md:flex">
            {modes.map((mode) => (
              <button
                key={mode.value}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  mode.value === viewMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => onViewMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Button variant="outline" aria-label="Поиск и фильтры" className="h-9 w-9 px-0">
            <Search className="h-4 w-4" />
          </Button>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 overflow-x-auto md:hidden">
        {modes.map((mode) => (
          <Button key={mode.value} variant={mode.value === viewMode ? "default" : "outline"} size="sm" onClick={() => onViewMode(mode.value)}>
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CalendarSidebar({
  isCollapsed,
  onToggle,
  selectedDate,
  students,
  selectedStudentId,
  onStudent,
  lessonFilter,
  onLessonFilter,
  onDatePick,
  onCreate,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedDate: Date;
  students: Array<{ id: number; name: string }>;
  selectedStudentId: string;
  onStudent: (value: string) => void;
  lessonFilter: LessonFilter;
  onLessonFilter: (value: LessonFilter) => void;
  onDatePick: (date: Date) => void;
  onCreate: () => void;
}) {
  if (isCollapsed) {
    return (
      <div className="flex w-14 shrink-0 flex-col items-center gap-2 rounded-xl border bg-white p-2">
        <Button variant="outline" onClick={onToggle} aria-label="Развернуть панель" className="h-9 w-9 px-0">
          <Menu className="h-4 w-4" />
        </Button>
        <Button onClick={onCreate} aria-label="Создать занятие" className="h-9 w-9 px-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  return (
    <aside className="w-72 shrink-0 space-y-4 rounded-xl border bg-white p-4">
      {/* Комментарий наставника: локальная collapsible-панель внутри calendar-page экономит место и не вмешивается в глобальный app shell. */}
      <div className="flex items-center justify-between">
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать занятие
        </Button>
        <Button variant="ghost" onClick={onToggle} aria-label="Свернуть панель" className="h-9 w-9 px-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-semibold capitalize text-slate-800">
          {selectedDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <span key={d}>{d}</span>
          ))}
          {Array.from({ length: monthEnd.getDate() }).map((_, i) => {
            const day = new Date(monthStart);
            day.setDate(i + 1);
            const isActive = day.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={day.toISOString()}
                className={`rounded-md py-1 transition ${isActive ? "bg-blue-100 font-medium text-blue-700" : "hover:bg-slate-100"}`}
                onClick={() => onDatePick(day)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Фильтры</p>
        {FILTER_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
              lessonFilter === item.key ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            }`}
            onClick={() => onLessonFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ученик</p>
        <select className="w-full rounded-md border px-2 py-2 text-sm" value={selectedStudentId} onChange={(event) => onStudent(event.target.value)}>
          <option value="all">Все ученики</option>
          {students.map((student) => (
            <option key={student.id} value={String(student.id)}>
              {student.name}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

const LESSON_STYLE: Record<string, string> = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-900",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  canceled: "border-rose-200 bg-rose-50 text-rose-800",
};

export function LessonCard({
  lesson,
  studentName,
  style,
  onClick,
}: {
  lesson: { id: number; start_at: string; duration_min: number; status: "scheduled" | "done" | "canceled"; topic?: string | null; is_paid?: boolean | null; series_id?: number | null };
  studentName: string;
  style?: CSSProperties;
  onClick: () => void;
}) {
  return (
    <button className={`rounded-md border px-2 py-1.5 text-left text-xs shadow-sm ${LESSON_STYLE[lesson.status]}`} style={style} onClick={onClick}>
      {/* Комментарий наставника: статус остаётся цветовым кодом — это ускоряет сканирование расписания без перегруза текста в карточке. */}
      <p className="font-medium">{studentName}</p>
      <p className="truncate">{lesson.topic || "Без темы"}</p>
      <p>{new Date(lesson.start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
      <div className="mt-1 flex items-center gap-1">
        {lesson.is_paid ? <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px]">Оплачено</span> : null}
        {lesson.series_id ? <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px]">Повтор</span> : null}
      </div>
    </button>
  );
}

export function MonthGrid({
  days,
  lessonsByDay,
  onCreate,
  onOpenLesson,
  studentsMap,
}: {
  days: Date[];
  lessonsByDay: Map<string, Array<{ id: number; start_at: string; duration_min: number; status: "scheduled" | "done" | "canceled"; topic?: string | null; student_id: number; is_paid?: boolean | null; series_id?: number | null }>>;
  onCreate: (day: Date) => void;
  onOpenLesson: (lessonId: number) => void;
  studentsMap: Map<number, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => {
        const key = day.toDateString();
        const dayLessons = lessonsByDay.get(key) ?? [];
        return (
          <button key={key} className="min-h-32 rounded-lg border bg-white p-2 text-left hover:bg-slate-50" onClick={() => onCreate(day)}>
            <p className="text-xs font-medium text-slate-600">{formatDayHeader(day, true)}</p>
            <div className="mt-2 space-y-1">
              {dayLessons.slice(0, 3).map((lesson) => (
                <div
                  key={lesson.id}
                  className={`rounded border px-1.5 py-1 text-[11px] ${LESSON_STYLE[lesson.status]}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenLesson(lesson.id);
                  }}
                >
                  {minuteToLabel(new Date(lesson.start_at).getHours() * 60 + new Date(lesson.start_at).getMinutes())} · {studentsMap.get(lesson.student_id) || "Ученик"}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
