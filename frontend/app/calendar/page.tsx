"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { CalendarSidebar, CalendarToolbar, LessonFilter, MonthGrid, WeeklyTimeGrid } from "@/app/calendar/components/workspace";
import { api, LessonItem } from "@/lib/api";
import {
  CalendarViewMode,
  formatRangeTitle,
  getCalendarAnchor,
  getVisibleDays,
  groupLessonsByDay,
  parseTimeToMinutes,
  resolveVisibleRange,
  shiftAnchor,
  toIsoLocal,
} from "@/lib/calendar";

const DEFAULT_FORM = { student_id: "", topic: "", duration_min: "60", price: "0", status: "scheduled" };

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-10 w-1/2 rounded-2xl bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-100" />
      </div>
      <div className="h-[calc(100vh-220px)] rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
    </div>
  );
}

export default function CalendarPage() {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => getCalendarAnchor(new Date(), "week"));
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{ id: number; name: string }>>([]);
  const [workdayStart, setWorkdayStart] = useState(8 * 60);
  const [workdayEnd, setWorkdayEnd] = useState(20 * 60);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");

  const [createAt, setCreateAt] = useState<Date | null>(null);
  const [editLesson, setEditLesson] = useState<LessonItem | null>(null);
  const [moveLesson, setMoveLesson] = useState<LessonItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const visibleDays = useMemo(() => getVisibleDays(anchorDate, viewMode), [anchorDate, viewMode]);
  const title = useMemo(() => formatRangeTitle(anchorDate, viewMode), [anchorDate, viewMode]);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(anchorDate);
      const to = new Date(anchorDate);
      if (viewMode === "month") {
        to.setMonth(to.getMonth() + 1);
      } else if (viewMode === "week") {
        to.setDate(to.getDate() + 7);
      } else if (viewMode === "3days") {
        to.setDate(to.getDate() + 3);
      } else {
        to.setDate(to.getDate() + 1);
      }

      const [items, studentList, settings] = await Promise.all([
        api.listLessons({ from: toIsoLocal(from), to: toIsoLocal(to) }),
        api.listStudents(),
        api.getSettings(),
      ]);
      setLessons(items);
      setStudents(studentList.map((x) => ({ id: x.id, name: x.name })));
      setWorkdayStart(parseTimeToMinutes(settings.workday_start, 8 * 60));
      setWorkdayEnd(parseTimeToMinutes(settings.workday_end, 20 * 60));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки календаря");
    } finally {
      setLoading(false);
    }
  }, [anchorDate, viewMode]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    setAnchorDate((prev) => getCalendarAnchor(prev, viewMode));
  }, [viewMode]);

  const studentsMap = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      if (lessonFilter !== "all" && lesson.status !== lessonFilter) return false;
      if (studentFilter !== "all" && lesson.student_id !== Number(studentFilter)) return false;
      return true;
    });
  }, [lessonFilter, lessons, studentFilter]);

  const lessonsByDay = useMemo(() => {
    return groupLessonsByDay(filteredLessons);
  }, [filteredLessons]);

  const visibleRange = useMemo(() => {
    if (viewMode === "month") return { startMinute: 0, endMinute: 24 * 60 };
    const scopedLessons = visibleDays.flatMap((day) => lessonsByDay.get(day.toDateString()) ?? []);
    // Комментарий наставника: показываем рабочий диапазон + уроки рядом, чтобы убрать пустую ночную прокрутку и сохранить контекст занятий вне диапазона.
    return resolveVisibleRange({ workdayStart, workdayEnd, lessons: scopedLessons });
  }, [lessonsByDay, viewMode, visibleDays, workdayEnd, workdayStart]);

  const openCreateForSlot = (day: Date, minute: number) => {
    const slot = new Date(day);
    slot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    setForm(DEFAULT_FORM);
    setCreateAt(slot);
  };

  const submitCreate = async () => {
    if (!createAt || !form.student_id) return;
    try {
      setError(null);
      await api.createLesson({
        student_id: Number(form.student_id),
        start_at: createAt.toISOString(),
        duration_min: Number(form.duration_min),
        status: form.status,
        topic: form.topic || null,
        price: Number(form.price),
      });
      setCreateAt(null);
      showToast("Занятие создано", "success");
      await loadLessons();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать занятие";
      setError(message);
      showToast(message, "error");
    }
  };

  const submitEdit = async () => {
    if (!editLesson) return;
    try {
      setError(null);
      await api.updateLesson(editLesson.id, {
        status: editLesson.status,
        topic: editLesson.topic ?? null,
        duration_min: editLesson.duration_min,
        price: editLesson.price,
      });
      setEditLesson(null);
      showToast("Занятие обновлено", "success");
      await loadLessons();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось обновить занятие";
      setError(message);
      showToast(message, "error");
    }
  };

  const submitMove = async (newDateTime: string) => {
    if (!moveLesson) return;
    try {
      setError(null);
      await api.updateLesson(moveLesson.id, { start_at: new Date(newDateTime).toISOString() });
      setMoveLesson(null);
      showToast("Занятие перенесено", "success");
      await loadLessons();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось перенести занятие";
      setError(message);
      showToast(message, "error");
    }
  };

  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    return Array.from({ length: end.getDate() }).map((_, i) => {
      const day = new Date(start);
      day.setDate(i + 1);
      return day;
    });
  }, [anchorDate, viewMode]);

  if (loading && lessons.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Календарь</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">Рабочее расписание по дням, неделям и месяцу</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Планируйте занятия на холсте, быстро создавайте новые слоты и правьте уроки прямо в контексте календаря.
          </p>
        </div>
      </section>

      <CalendarToolbar
        title={title}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onPrev={() => setAnchorDate((prev) => shiftAnchor(prev, viewMode, -1))}
        onNext={() => setAnchorDate((prev) => shiftAnchor(prev, viewMode, 1))}
        onToday={() => setAnchorDate(getCalendarAnchor(new Date(), viewMode))}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        onCreate={() => openCreateForSlot(new Date(), workdayStart)}
      />

      <div className="flex gap-3">
        <CalendarSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
          selectedDate={anchorDate}
          students={students}
          selectedStudentId={studentFilter}
          onStudent={setStudentFilter}
          lessonFilter={lessonFilter}
          onLessonFilter={setLessonFilter}
          onDatePick={(date) => setAnchorDate(getCalendarAnchor(date, viewMode))}
          onCreate={() => openCreateForSlot(new Date(), workdayStart)}
        />

        <div className="min-w-0 flex-1 rounded-[32px] border border-slate-200 bg-white/90 p-3 shadow-sm">
          {error ? <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {viewMode === "month" ? (
            <MonthGrid
              days={monthDays}
              lessonsByDay={lessonsByDay}
              onCreate={(day) => openCreateForSlot(day, workdayStart)}
              onOpenLesson={(lessonId) => {
                const found = filteredLessons.find((lesson) => lesson.id === lessonId);
                if (found) setEditLesson(found);
              }}
              studentsMap={studentsMap}
            />
          ) : (
            <WeeklyTimeGrid
              days={visibleDays}
              lessonsByDay={lessonsByDay}
              studentsMap={studentsMap}
              startMinute={visibleRange.startMinute}
              endMinute={visibleRange.endMinute}
              onCreate={openCreateForSlot}
              onOpenLesson={(lesson) => setEditLesson(lesson)}
            />
          )}
          {loading ? <p className="mt-3 text-sm text-slate-500">Обновляем календарь...</p> : null}
        </div>
      </div>

      {createAt ? (
        <LessonCreateModal
          createAt={createAt}
          students={students}
          form={form}
          onClose={() => setCreateAt(null)}
          onChange={setForm}
          onSubmit={() => void submitCreate()}
        />
      ) : null}

      {editLesson ? (
        <LessonDetailsDrawer
          lesson={editLesson}
          studentName={studentsMap.get(editLesson.student_id) || `Ученик #${editLesson.student_id}`}
          onClose={() => setEditLesson(null)}
          onChange={setEditLesson}
          onSubmit={() => void submitEdit()}
          onMove={() => setMoveLesson(editLesson)}
        />
      ) : null}

      {moveLesson ? <MoveModal lesson={moveLesson} onClose={() => setMoveLesson(null)} onSave={submitMove} /> : null}
    </div>
  );
}

function LessonCreateModal({
  createAt,
  students,
  form,
  onClose,
  onChange,
  onSubmit,
}: {
  createAt: Date;
  students: Array<{ id: number; name: string }>;
  form: { student_id: string; topic: string; duration_min: string; price: string; status: string };
  onClose: () => void;
  onChange: (next: { student_id: string; topic: string; duration_min: string; price: string; status: string }) => void;
  onSubmit: () => void;
}) {
  const inputClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <p className="text-sm font-medium text-sky-700">Новый урок</p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900">Быстрое создание</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{createAt.toLocaleString("ru-RU")}</p>
        <div className="mt-6 space-y-4">
          <select className={inputClass} value={form.student_id} onChange={(e) => onChange({ ...form, student_id: e.target.value })}>
          <option value="">Выберите ученика</option>
          {students.map((student) => (
            <option value={student.id} key={student.id}>
              {student.name}
            </option>
          ))}
        </select>
          <input className={inputClass} placeholder="Тема" value={form.topic} onChange={(e) => onChange({ ...form, topic: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} type="number" value={form.duration_min} onChange={(e) => onChange({ ...form, duration_min: e.target.value })} />
            <input className={inputClass} type="number" value={form.price} onChange={(e) => onChange({ ...form, price: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={onSubmit} className="rounded-2xl">Создать</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonDetailsDrawer({
  lesson,
  studentName,
  onClose,
  onChange,
  onSubmit,
  onMove,
}: {
  lesson: LessonItem;
  studentName: string;
  onClose: () => void;
  onChange: (lesson: LessonItem) => void;
  onSubmit: () => void;
  onMove: () => void;
}) {
  const inputClass =
    "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45">
      <div className="ml-auto h-full w-full max-w-md border-l border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-medium text-sky-700">Занятие</p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900">Детали урока</h3>
        <p className="mt-2 text-sm text-slate-500">{studentName}</p>
        <div className="mt-6 space-y-4">
          <input className={inputClass} value={lesson.topic ?? ""} onChange={(e) => onChange({ ...lesson, topic: e.target.value })} />
          <select className={inputClass} value={lesson.status} onChange={(e) => onChange({ ...lesson, status: e.target.value as LessonItem["status"] })}>
          <option value="scheduled">Запланировано</option>
          <option value="done">Проведено</option>
          <option value="canceled">Отменено</option>
        </select>
          <div className="grid grid-cols-2 gap-3">
          <input
            className={inputClass}
            type="number"
            value={lesson.duration_min}
            onChange={(e) => onChange({ ...lesson, duration_min: Number(e.target.value) })}
          />
            <input className={inputClass} type="number" value={lesson.price} onChange={(e) => onChange({ ...lesson, price: Number(e.target.value) })} />
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={onMove} className="rounded-2xl">
              Перенести
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={onSubmit} className="rounded-2xl">Сохранить</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoveModal({ lesson, onClose, onSave }: { lesson: LessonItem; onClose: () => void; onSave: (newDateTime: string) => Promise<void> }) {
  const [value, setValue] = useState(() => {
    const d = new Date(lesson.start_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <p className="text-sm font-medium text-sky-700">Перенос</p>
        <h3 className="mt-1 text-2xl font-semibold text-slate-900">Перенести урок</h3>
        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={() => void onSave(value)} className="rounded-2xl">Сохранить</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
