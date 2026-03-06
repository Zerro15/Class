"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, LessonItem } from "@/lib/api";
import { formatDayHeader, formatRangeTitle, getLessonPosition, getStartOfWeek, getWeekDays, toIsoLocal } from "@/lib/calendar";

const HOUR_LABELS = Array.from({ length: 24 }).map((_, hour) => `${String(hour).padStart(2, "0")}:00`);

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{ id: number; name: string }>>([]);

  const [createAt, setCreateAt] = useState<Date | null>(null);
  const [editLesson, setEditLesson] = useState<LessonItem | null>(null);
  const [moveLesson, setMoveLesson] = useState<LessonItem | null>(null);

  const [form, setForm] = useState({ student_id: "", topic: "", duration_min: "60", price: "0", status: "scheduled" });

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(weekStart);
      const to = new Date(weekStart);
      to.setDate(to.getDate() + 7);
      const [items, studentList] = await Promise.all([
        api.listLessons({ from: toIsoLocal(from), to: toIsoLocal(to) }),
        api.listStudents(),
      ]);
      setLessons(items);
      setStudents(studentList.map((x) => ({ id: x.id, name: x.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки календаря");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const byDay = useMemo(() => {
    return weekDays.map((day) =>
      lessons.filter((lesson) => {
        const d = new Date(lesson.start_at);
        return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
      }),
    );
  }, [lessons, weekDays]);

  const now = new Date();
  const isCurrentWeek = now >= weekStart && now <= new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);

  const openCreateForSlot = (day: Date, hour: number) => {
    const slot = new Date(day);
    slot.setHours(hour, 0, 0, 0);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))}>Назад</Button>
          <Button variant="outline" onClick={() => setWeekStart(getStartOfWeek(new Date()))}>Сегодня</Button>
          <Button variant="outline" onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))}>Вперёд</Button>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">{formatRangeTitle(weekStart)}</h1>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <div className="grid min-w-[960px] grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-r bg-slate-50" />
          {weekDays.map((day) => {
            const isToday = day.toDateString() === now.toDateString();
            return (
              <div key={day.toISOString()} className={`border-b px-2 py-3 text-center text-sm ${isToday ? "bg-blue-50 font-medium text-blue-700" : "bg-slate-50 text-slate-700"}`}>
                {formatDayHeader(day)}
              </div>
            );
          })}

          <div className="relative border-r">
            {HOUR_LABELS.map((label, hour) => (
              <div key={label} className="h-16 border-b pr-2 pt-1 text-right text-xs text-slate-400">{hour > 0 ? label : ""}</div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => (
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              {HOUR_LABELS.map((label, hour) => (
                <button key={`${day.toISOString()}-${label}`} className="h-16 w-full border-b hover:bg-slate-50" onClick={() => openCreateForSlot(day, hour)} />
              ))}

              {byDay[dayIndex].map((lesson) => {
                const { topPercent, heightPercent } = getLessonPosition(lesson.start_at, lesson.duration_min);
                return (
                  <button
                    key={lesson.id}
                    className="absolute left-1 right-1 rounded-md border border-blue-200 bg-blue-50 p-2 text-left text-xs text-slate-700 shadow-sm"
                    style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
                    onClick={() => setEditLesson(lesson)}
                  >
                    <p className="font-semibold text-slate-800">{lesson.topic || "Без темы"}</p>
                    <p>{lesson.student_name || `Ученик #${lesson.student_id}`}</p>
                    <p>{new Date(lesson.start_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p>Статус: {lesson.status}</p>
                    {lesson.series_id ? <span className="mt-1 inline-block rounded bg-violet-100 px-1 py-0.5 text-[10px] text-violet-700">Постоянное</span> : null}
                  </button>
                );
              })}

              {isCurrentWeek && day.toDateString() === now.toDateString() ? (
                <div className="pointer-events-none absolute left-0 right-0 z-20 border-t border-red-400" style={{ top: `${((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100}%` }} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Загружаем уроки...</p> : null}

      {createAt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
            <h3 className="text-lg font-semibold">Быстрое создание урока</h3>
            <p className="text-sm text-slate-500">{createAt.toLocaleString("ru-RU")}</p>
            <select className="w-full rounded border px-3 py-2" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
              <option value="">Выберите ученика</option>
              {students.map((student) => (
                <option value={student.id} key={student.id}>{student.name}</option>
              ))}
            </select>
            <input className="w-full rounded border px-3 py-2" placeholder="Тема" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2" type="number" value={form.duration_min} onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))} />
              <input className="rounded border px-3 py-2" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateAt(null)}>Отмена</Button>
              <Button onClick={() => void submitCreate()}>Создать</Button>
            </div>
          </div>
        </div>
      ) : null}

      {editLesson ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
            <h3 className="text-lg font-semibold">Редактирование урока</h3>
            <input className="w-full rounded border px-3 py-2" value={editLesson.topic ?? ""} onChange={(e) => setEditLesson({ ...editLesson, topic: e.target.value })} />
            <select className="w-full rounded border px-3 py-2" value={editLesson.status} onChange={(e) => setEditLesson({ ...editLesson, status: e.target.value as LessonItem["status"] })}>
              <option value="scheduled">Запланировано</option>
              <option value="done">Проведено</option>
              <option value="canceled">Отменено</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2" type="number" value={editLesson.duration_min} onChange={(e) => setEditLesson({ ...editLesson, duration_min: Number(e.target.value) })} />
              <input className="rounded border px-3 py-2" type="number" value={editLesson.price} onChange={(e) => setEditLesson({ ...editLesson, price: Number(e.target.value) })} />
            </div>
            {editLesson.series_id ? <p className="text-xs text-slate-500">Серия обнаружена, но массовое обновление пока не поддерживается текущим API.</p> : null}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setMoveLesson(editLesson)}>Перенести</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditLesson(null)}>Отмена</Button>
                <Button onClick={() => void submitEdit()}>Сохранить</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {moveLesson ? (
        <MoveModal lesson={moveLesson} onClose={() => setMoveLesson(null)} onSave={submitMove} />
      ) : null}
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
        {lesson.series_id ? <p className="text-xs text-slate-500">Для занятий из серии применяется перенос только текущего урока.</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={() => void onSave(value)}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}
