"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CalendarSidebar, CalendarToolbar, LessonCard, LessonFilter, MonthGrid } from "@/app/calendar/components/workspace";
import { api, LessonItem } from "@/lib/api";
import {
  CalendarViewMode,
  formatDayHeader,
  formatRangeTitle,
  getCalendarAnchor,
  getLessonPosition,
  getTimeGridLabels,
  getVisibleDays,
  minuteToLabel,
  parseTimeToMinutes,
  resolveVisibleRange,
  shiftAnchor,
  toIsoLocal,
} from "@/lib/calendar";

const DEFAULT_FORM = { student_id: "", topic: "", duration_min: "60", price: "0", status: "scheduled" };

export default function CalendarPage() {
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
    const map = new Map<string, LessonItem[]>();
    for (const lesson of filteredLessons) {
      const key = new Date(lesson.start_at).toDateString();
      const list = map.get(key) ?? [];
      list.push(lesson);
      map.set(key, list);
    }
    return map;
  }, [filteredLessons]);

  const visibleRange = useMemo(() => {
    if (viewMode === "month") return { startMinute: 0, endMinute: 24 * 60 };
    const scopedLessons = visibleDays.flatMap((day) => lessonsByDay.get(day.toDateString()) ?? []);
    // Комментарий наставника: показываем рабочий диапазон + уроки рядом, чтобы убрать пустую ночную прокрутку и сохранить контекст занятий вне диапазона.
    return resolveVisibleRange({ workdayStart, workdayEnd, lessons: scopedLessons });
  }, [lessonsByDay, viewMode, visibleDays, workdayEnd, workdayStart]);

  const timeLabels = useMemo(() => getTimeGridLabels(visibleRange.startMinute, visibleRange.endMinute, 60), [visibleRange]);

  const openCreateForSlot = (day: Date, minute: number) => {
    const slot = new Date(day);
    slot.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    setForm(DEFAULT_FORM);
    setCreateAt(slot);
  };

  const submitCreate = async () => {
    if (!createAt || !form.student_id) return;
    await api.createLesson({
      student_id: Number(form.student_id),
      start_at: createAt.toISOString(),
      duration_min: Number(form.duration_min),
      status: form.status,
      topic: form.topic || null,
      price: Number(form.price),
    });
    setCreateAt(null);
    await loadLessons();
  };

  const submitEdit = async () => {
    if (!editLesson) return;
    await api.updateLesson(editLesson.id, {
      status: editLesson.status,
      topic: editLesson.topic ?? null,
      duration_min: editLesson.duration_min,
      price: editLesson.price,
    });
    setEditLesson(null);
    await loadLessons();
  };

  const submitMove = async (newDateTime: string) => {
    if (!moveLesson) return;
    await api.updateLesson(moveLesson.id, { start_at: new Date(newDateTime).toISOString() });
    setMoveLesson(null);
    await loadLessons();
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

  const now = new Date();

  return (
    <div className="space-y-3">
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

        <div className="min-w-0 flex-1 rounded-xl border bg-white p-3">
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
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
            <div className="overflow-auto rounded-lg border">
              <div className={`grid min-w-[840px] grid-cols-[72px_repeat(${visibleDays.length},minmax(0,1fr))]`}>
                <div className="sticky left-0 top-0 z-30 border-b border-r bg-slate-50" />
                {visibleDays.map((day) => {
                  const isToday = day.toDateString() === now.toDateString();
                  return (
                    <div
                      key={day.toISOString()}
                      className={`sticky top-0 z-20 border-b px-2 py-2 text-center text-sm ${isToday ? "bg-blue-50 font-semibold text-blue-700" : "bg-slate-50 text-slate-700"}`}
                    >
                      {formatDayHeader(day)}
                    </div>
                  );
                })}

                <div className="sticky left-0 z-20 border-r bg-white">
                  {timeLabels.map((minute) => (
                    <div key={minute} className="h-16 border-b pr-2 pt-1 text-right text-xs text-slate-400">
                      {minuteToLabel(minute)}
                    </div>
                  ))}
                </div>

                {visibleDays.map((day) => {
                  const dayLessons = lessonsByDay.get(day.toDateString()) ?? [];
                  return (
                    <div key={day.toISOString()} className="relative border-r last:border-r-0">
                      {timeLabels.map((minute) => (
                        <button
                          key={`${day.toISOString()}-${minute}`}
                          className="h-16 w-full border-b hover:bg-slate-50"
                          onClick={() => openCreateForSlot(day, minute)}
                        />
                      ))}

                      {dayLessons.map((lesson) => {
                        const { topPercent, heightPercent } = getLessonPosition(
                          lesson.start_at,
                          lesson.duration_min,
                          visibleRange.startMinute,
                          visibleRange.endMinute,
                        );
                        const studentName = studentsMap.get(lesson.student_id) || `Ученик #${lesson.student_id}`;
                        return (
                          <div key={lesson.id} className="absolute left-1 right-1" style={{ top: `${topPercent}%`, minHeight: `${heightPercent}%` }}>
                            <LessonCard lesson={lesson} studentName={studentName} onClick={() => setEditLesson(lesson)} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {loading ? <p className="mt-2 text-sm text-slate-500">Загружаем уроки...</p> : null}
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Быстрое создание урока</h3>
        <p className="text-sm text-slate-500">{createAt.toLocaleString("ru-RU")}</p>
        <select className="w-full rounded border px-3 py-2" value={form.student_id} onChange={(e) => onChange({ ...form, student_id: e.target.value })}>
          <option value="">Выберите ученика</option>
          {students.map((student) => (
            <option value={student.id} key={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <input className="w-full rounded border px-3 py-2" placeholder="Тема" value={form.topic} onChange={(e) => onChange({ ...form, topic: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded border px-3 py-2" type="number" value={form.duration_min} onChange={(e) => onChange({ ...form, duration_min: e.target.value })} />
          <input className="rounded border px-3 py-2" type="number" value={form.price} onChange={(e) => onChange({ ...form, price: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onSubmit}>Создать</Button>
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
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40">
      <div className="ml-auto h-full w-full max-w-md space-y-3 border-l bg-white p-5 shadow-2xl">
        {/* Комментарий наставника: drawer ускоряет правки из календаря и сохраняет контекст недели, а action-heavy операции остаются на dashboard. */}
        <h3 className="text-lg font-semibold">Детали занятия</h3>
        <p className="text-sm text-slate-500">{studentName}</p>
        <input className="w-full rounded border px-3 py-2" value={lesson.topic ?? ""} onChange={(e) => onChange({ ...lesson, topic: e.target.value })} />
        <select className="w-full rounded border px-3 py-2" value={lesson.status} onChange={(e) => onChange({ ...lesson, status: e.target.value as LessonItem["status"] })}>
          <option value="scheduled">Запланировано</option>
          <option value="done">Проведено</option>
          <option value="canceled">Отменено</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded border px-3 py-2"
            type="number"
            value={lesson.duration_min}
            onChange={(e) => onChange({ ...lesson, duration_min: Number(e.target.value) })}
          />
          <input className="rounded border px-3 py-2" type="number" value={lesson.price} onChange={(e) => onChange({ ...lesson, price: Number(e.target.value) })} />
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onMove}>
            Перенести
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={onSubmit}>Сохранить</Button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Перенос урока</h3>
        <input className="w-full rounded border px-3 py-2" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void onSave(value)}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}
