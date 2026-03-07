"use client";

import type { CSSProperties, DragEvent } from "react";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Copy,
  Grip,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LessonItem } from "@/lib/api";
import {
  CalendarViewMode,
  MIN_EVENT_HEIGHT_PX,
  PIXELS_PER_HOUR,
  TIME_SLOT_MINUTES,
  formatDayHeader,
  layoutDayLessons,
  minuteToLabel,
} from "@/lib/calendar";

const FILTER_ITEMS = [
  { key: "all", label: "Все занятия" },
  { key: "scheduled", label: "Запланированные" },
  { key: "done", label: "Проведённые" },
  { key: "canceled", label: "Отменённые" },
] as const;

const LESSON_COLOR_CLASSES: Record<string, string> = {
  green: "border-emerald-400/50 bg-emerald-500/25 text-emerald-50",
  yellow: "border-amber-300/40 bg-amber-400/25 text-amber-50",
  blue: "border-blue-400/45 bg-blue-500/30 text-blue-50",
  orange: "border-orange-300/40 bg-orange-500/28 text-orange-50",
  purple: "border-violet-400/50 bg-violet-500/28 text-violet-50",
};

const LESSON_COLOR_DOTS: Array<{ key: string; className: string }> = [
  { key: "green", className: "bg-emerald-500" },
  { key: "yellow", className: "bg-amber-400" },
  { key: "blue", className: "bg-blue-500" },
  { key: "orange", className: "bg-orange-500" },
  { key: "purple", className: "bg-violet-500" },
];

export type LessonFilter = (typeof FILTER_ITEMS)[number]["key"];

function getWeekNumber(date: Date) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function CalendarToolbar({
  viewMode,
  onViewMode,
  onPrev,
  onNext,
  onToday,
  onToggleSidebar,
  anchorDate,
}: {
  viewMode: CalendarViewMode;
  onViewMode: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleSidebar: () => void;
  anchorDate: Date;
}) {
  const modes: Array<{ value: CalendarViewMode; label: string }> = [
    { value: "day", label: "День" },
    { value: "3days", label: "3 дня" },
    { value: "week", label: "Неделя" },
    { value: "month", label: "Месяц" },
  ];
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(anchorDate);
  const weekBadge = `Неделя ${getWeekNumber(anchorDate)}`;

  return (
    <div className="sticky top-0 z-40 rounded-2xl border border-slate-700 bg-[#202124]/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            aria-label="Показать или скрыть календарную панель"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-700/70 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-base font-medium tracking-wide">Календарь</p>
          <Button variant="outline" onClick={onToday} className="rounded-full border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700">
            Сегодня
          </Button>
          <div className="flex items-center">
            <button onClick={onPrev} aria-label="Назад" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-700/70">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={onNext} aria-label="Вперёд" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-700/70">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-lg font-semibold capitalize text-slate-100">{monthLabel}</p>
          <span className="rounded-full border border-sky-400/60 bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">{weekBadge}</span>
        </div>

        <div className="flex items-center gap-1">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-slate-700/70 hover:text-white" aria-label="Поиск">
            <Search className="h-4 w-4" />
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-slate-700/70 hover:text-white" aria-label="Справка">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-slate-700/70 hover:text-white" aria-label="Настройки">
            <Settings className="h-4 w-4" />
          </button>
          <div className="hidden items-center rounded-xl border border-slate-600 bg-slate-800/80 p-1 md:flex">
            {modes.map((mode) => (
              <button
                key={mode.value}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  mode.value === viewMode ? "bg-slate-600 text-white" : "text-slate-300 hover:bg-slate-700"
                }`}
                onClick={() => onViewMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
            <button className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-700">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
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
      <aside className="flex h-fit w-[72px] shrink-0 flex-col items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={onToggle} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Развернуть панель">
          <Menu className="h-4 w-4" />
        </button>
        <button onClick={onCreate} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800" aria-label="Создать занятие">
          <Plus className="h-4 w-4" />
        </button>
        <CalendarDays className="mt-1 h-4 w-4 text-slate-400" />
      </aside>
    );
  }

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  const startWeekday = ((monthStart.getDay() + 6) % 7);

  return (
    <aside className="w-[260px] shrink-0 space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between">
        <button onClick={onCreate} className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-3 font-medium text-white transition hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Создать
        </button>
        <button onClick={onToggle} className="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Свернуть панель">
          <Grip className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold capitalize">{selectedDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-slate-500">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
          {Array.from({ length: startWeekday }).map((_, index) => (
            <span key={`empty-${index}`} className="py-1" />
          ))}
          {Array.from({ length: monthEnd.getDate() }).map((_, index) => {
            const day = new Date(monthStart);
            day.setDate(index + 1);
            const isActive = day.toDateString() === selectedDate.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <button
                key={day.toISOString()}
                className={`rounded-md py-1 transition ${isActive ? "bg-blue-600 text-white" : isToday ? "text-blue-600" : "text-slate-700 hover:bg-slate-100"}`}
                onClick={() => onDatePick(day)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Фильтры</p>
        <div className="space-y-1">
          {FILTER_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`w-full min-w-0 truncate rounded-lg px-2 py-1.5 text-left text-sm transition ${lessonFilter === item.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              onClick={() => onLessonFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ученик</p>
        <select
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
          value={selectedStudentId}
          onChange={(event) => onStudent(event.target.value)}
        >
          <option value="all">Все ученики</option>
          {students.map((student) => (
            <option key={student.id} value={String(student.id)}>
              {student.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-semibold">Быстрый поиск</p>
        <p>Найдите окно для занятий и сразу создайте урок в нужном слоте.</p>
      </div>
    </aside>
  );
}

export function LessonCard({
  lesson,
  studentName,
  style,
  color,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onColorChange,
  onDragStart,
}: {
  lesson: LessonItem;
  studentName: string;
  style?: CSSProperties;
  color: string;
  onClick: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange: (value: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, lessonId: number) => void;
}) {
  const startMinute = new Date(lesson.start_at).getHours() * 60 + new Date(lesson.start_at).getMinutes();
  const endMinute = startMinute + lesson.duration_min;
  const colorClass = LESSON_COLOR_CLASSES[color] ?? LESSON_COLOR_CLASSES.blue;

  return (
    <div
      className={`group relative h-full min-w-0 overflow-hidden cursor-grab rounded-xl border px-2 py-2 text-left shadow-md transition hover:shadow-lg ${colorClass}`}
      style={style}
      onClick={onClick}
      draggable
      onDragStart={(event) => onDragStart(event, lesson.id)}
    >
      <p className="truncate text-sm font-bold leading-tight">{studentName}</p>
      <p className="truncate text-xs opacity-95 leading-tight">{lesson.topic || "Без темы"}</p>
      <p className="text-xs">{Math.round(lesson.price)} ₽</p>
      <p className="text-xs">{`${minuteToLabel(startMinute)}–${minuteToLabel(endMinute)}`}</p>

      <div className="absolute right-1 top-1 hidden max-w-[calc(100%-8px)] items-center gap-1 overflow-hidden rounded-lg bg-slate-950/80 p-1 group-hover:flex">
        <button className="rounded p-1 text-slate-100 hover:bg-slate-700" onClick={(event) => { event.stopPropagation(); onEdit(); }} aria-label="Редактировать">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button className="rounded p-1 text-slate-100 hover:bg-slate-700" onClick={(event) => { event.stopPropagation(); onDuplicate(); }} aria-label="Дублировать">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button className="rounded p-1 text-rose-300 hover:bg-rose-500/20" onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label="Удалить">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="absolute bottom-1 right-1 hidden items-center gap-1 rounded-full bg-slate-950/80 p-1 group-hover:flex">
        {LESSON_COLOR_DOTS.map((item) => (
          <button
            key={item.key}
            className={`h-3 w-3 rounded-full ${item.className} ${color === item.key ? "ring-2 ring-white" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onColorChange(item.key);
            }}
            aria-label={`Цвет ${item.key}`}
          />
        ))}
      </div>
    </div>
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
    <div className="grid grid-cols-2 gap-3 text-slate-100 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => {
        const key = day.toDateString();
        const dayLessons = lessonsByDay.get(key) ?? [];
        return (
          <button key={key} className="min-h-32 min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-[#25262b] p-2 text-left transition hover:bg-slate-800" onClick={() => onCreate(day)}>
            <p className="text-xs font-medium text-slate-300">{formatDayHeader(day, true)}</p>
            <div className="mt-2 space-y-1">
              {dayLessons.slice(0, 3).map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-md border border-slate-600 bg-slate-700/70 px-1.5 py-1 text-[11px] text-slate-100"
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

type WeeklyGridLesson = LessonItem;

export function WeeklyTimeGrid({
  days,
  lessonsByDay,
  studentsMap,
  startMinute,
  endMinute,
  lessonColors,
  onCreate,
  onOpenLesson,
  onMoveLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onColorChange,
}: {
  days: Date[];
  lessonsByDay: Map<string, WeeklyGridLesson[]>;
  studentsMap: Map<number, string>;
  startMinute: number;
  endMinute: number;
  lessonColors: Record<number, string>;
  onCreate: (day: Date, minute: number) => void;
  onOpenLesson: (lesson: WeeklyGridLesson) => void;
  onMoveLesson: (lessonId: number, day: Date, minute: number) => void;
  onDuplicateLesson: (lesson: WeeklyGridLesson) => void;
  onDeleteLesson: (lesson: WeeklyGridLesson) => void;
  onColorChange: (lessonId: number, color: string) => void;
}) {
  const slots = Array.from({ length: Math.ceil((endMinute - startMinute) / TIME_SLOT_MINUTES) + 1 }).map((_, index) => startMinute + index * TIME_SLOT_MINUTES);
  const pixelsPerMinute = PIXELS_PER_HOUR / 60;
  const gridHeight = Math.max((endMinute - startMinute) * pixelsPerMinute, 760);
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const showNowLine = nowMinute >= startMinute && nowMinute <= endMinute;
  const nowOffset = (nowMinute - startMinute) * pixelsPerMinute;

  return (
    <div className="h-[calc(100vh-210px)] overflow-auto rounded-2xl border border-slate-700 bg-[#202124] shadow-2xl">
      <div
        className="grid min-w-[980px]"
        style={{ gridTemplateColumns: `68px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="sticky left-0 top-0 z-40 border-b border-r border-slate-700 bg-[#202124]" />
        {days.map((day) => {
          const isToday = day.toDateString() === now.toDateString();
          return (
            <div key={day.toISOString()} className="sticky top-0 z-30 border-b border-slate-700 bg-[#202124] px-2 py-2 text-center">
              <p className="text-xs uppercase text-slate-400">{new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(day)}</p>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${isToday ? "bg-sky-500 text-white" : "text-slate-200"}`}>{day.getDate()}</span>
            </div>
          );
        })}

        <div className="sticky left-0 z-30 border-r border-slate-700 bg-[#202124]">
          <div style={{ height: gridHeight }} className="relative">
            {slots.map((minute) => {
              const top = (minute - startMinute) * pixelsPerMinute;
              const isHour = minute % 60 === 0;
              return (
                <div key={`time-${minute}`} className={`absolute right-2 text-right text-xs ${isHour ? "text-slate-400" : "text-slate-600"}`} style={{ top: Math.max(0, top - 8) }}>
                  {isHour ? minuteToLabel(minute) : ""}
                </div>
              );
            })}
          </div>
        </div>

        {days.map((day) => {
          const dayLessons = lessonsByDay.get(day.toDateString()) ?? [];
          const positioned = layoutDayLessons({
            lessons: dayLessons,
            rangeStartMinute: startMinute,
            pixelsPerMinute,
          });
          const isToday = day.toDateString() === now.toDateString();

          return (
            <div key={day.toISOString()} className={`relative min-w-0 overflow-hidden border-r border-slate-700 ${isToday ? "bg-sky-500/5" : "bg-[#202124]"}`} style={{ height: gridHeight }}>
              {slots.map((minute) => {
                const top = (minute - startMinute) * pixelsPerMinute;
                const isHour = minute % 60 === 0;
                return (
                  <button
                    key={`${day.toISOString()}-${minute}`}
                    className={`absolute left-0 right-0 border-t transition hover:bg-slate-700/30 ${isHour ? "border-slate-700" : "border-slate-800"}`}
                    style={{ top, height: TIME_SLOT_MINUTES * pixelsPerMinute }}
                    onClick={() => onCreate(day, minute)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const lessonId = Number(event.dataTransfer.getData("lesson-id"));
                      if (lessonId) onMoveLesson(lessonId, day, minute);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    aria-label={`Создать занятие на ${formatDayHeader(day, true)} ${minuteToLabel(minute)}`}
                  />
                );
              })}

              {showNowLine && isToday ? (
                <div className="absolute left-0 right-0 z-20 border-t-2 border-red-500" style={{ top: nowOffset }}>
                  <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                </div>
              ) : null}

              {positioned.map((item) => {
                const studentName = studentsMap.get(item.lesson.student_id) || `Ученик #${item.lesson.student_id}`;
                return (
                  <div
                    key={item.lesson.id}
                    className="absolute z-30 min-w-0 overflow-hidden px-1"
                    style={{
                      top: item.top,
                      height: item.height,
                      left: `${item.left}%`,
                      width: `${item.width}%`,
                      minHeight: MIN_EVENT_HEIGHT_PX,
                    }}
                  >
                    <LessonCard
                      lesson={item.lesson}
                      studentName={studentName}
                      onClick={() => onOpenLesson(item.lesson)}
                      style={{ height: "100%" }}
                      color={lessonColors[item.lesson.id] ?? "blue"}
                      onEdit={() => onOpenLesson(item.lesson)}
                      onDuplicate={() => onDuplicateLesson(item.lesson)}
                      onDelete={() => onDeleteLesson(item.lesson)}
                      onColorChange={(color) => onColorChange(item.lesson.id, color)}
                      onDragStart={(event, lessonId) => {
                        event.dataTransfer.setData("lesson-id", String(lessonId));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-slate-700 bg-[#202124] px-4 py-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Подсказка: перетащите карточку на другой слот для переноса.
        </span>
      </div>
    </div>
  );
}
