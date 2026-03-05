"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Lesson {
  id: number;
  student_id: number;
  series_id?: number | null;
  start_at: string;
  duration_min: number;
  status: "scheduled" | "done" | "canceled";
  topic?: string | null;
  price: number;
  is_paid?: boolean | null;
  is_homework_sent?: boolean | null;
}
interface StudentOption { id: number; name: string }
interface LessonSeries { id: number; student_id: number; weekday: number; time_of_day: string; duration_min: number; topic?: string | null; price: number; is_active: boolean }

const badgeBase = "rounded-full border px-2.5 py-1 text-xs font-medium";
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function DashboardPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [series, setSeries] = useState<LessonSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Lesson | null>(null);
  const [deletingSeriesId, setDeletingSeriesId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [isSeriesOpen, setIsSeriesOpen] = useState(false);
  const [isSeriesFormOpen, setIsSeriesFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonTime, setLessonTime] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [price, setPrice] = useState("0");
  const [topic, setTopic] = useState("");
  const [applyMode, setApplyMode] = useState<"single" | "future">("single");
  const [seriesWeekday, setSeriesWeekday] = useState("0");
  const [seriesTime, setSeriesTime] = useState("18:00");
  const [seriesStudentId, setSeriesStudentId] = useState("");
  const [seriesDuration, setSeriesDuration] = useState("60");
  const [seriesPrice, setSeriesPrice] = useState("0");
  const [seriesTopic, setSeriesTopic] = useState("");
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const { showToast } = useToast();

  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcoming, studentsData, seriesData] = await Promise.all([api.getUpcoming(7), api.listStudents(), api.listLessonSeries()]);
      setItems(upcoming.items);
      setStudents(studentsData.map((s) => ({ id: s.id, name: s.name })));
      setSeries(seriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки занятий");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const safeAction = async (lessonId: number, fn: () => Promise<void>) => {
    setActionError(null); setSavingLessonId(lessonId);
    try { await fn(); await load(); showToast("Сохранено", "success"); }
    catch (err) { const message = err instanceof Error ? err.message : "Не удалось сохранить изменения"; setActionError(message); showToast(`Ошибка: ${message}`, "error"); }
    finally { setSavingLessonId(null); }
  };

  const toIso = (d: string, t: string) => {
    // Комментарий наставника: объединяем локальные date+time в ISO, чтобы сервер и клиент одинаково интерпретировали момент времени.
    return new Date(`${d}T${t}`).toISOString();
  };

  const openEdit = (lesson: Lesson) => {
    const dt = new Date(lesson.start_at);
    setEditLesson(lesson);
    setStudentId(String(lesson.student_id));
    setLessonDate(dt.toISOString().slice(0, 10));
    setLessonTime(dt.toISOString().slice(11, 16));
    setDurationMin(String(lesson.duration_min));
    setPrice(String(lesson.price));
    setTopic(lesson.topic ?? "");
    setApplyMode("single");
    setEditError(null);
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editLesson) return;
    const duration = Number(durationMin); const priceValue = Number(price); const sid = Number(studentId);
    if (!sid || !lessonDate || !lessonTime || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(priceValue) || priceValue < 0) {
      setEditError("Проверьте поля формы"); return;
    }
    await safeAction(editLesson.id, async () => {
      const startAt = toIso(lessonDate, lessonTime);
      const patch = { student_id: sid, start_at: startAt, duration_min: duration, topic: topic.trim() || null, price: priceValue };
      if (editLesson.series_id && applyMode === "future") {
        // Комментарий наставника: ветка "это занятие vs будущие" отдельно патчит текущее занятие и все будущие в серии.
        await api.updateLesson(editLesson.id, patch);
        await api.applySeriesPatch(editLesson.series_id, {
          from_start_at: editLesson.start_at,
          patch: { duration_min: duration, topic: topic.trim() || null, price: priceValue },
          also_update_series_template: true,
        });
      } else {
        await api.updateLesson(editLesson.id, patch);
      }
    });
    setIsEditOpen(false);
  };

  const handleCreateLesson = async () => {
    const sid = Number(seriesStudentId || studentId);
    const duration = Number(durationMin); const priceValue = Number(price);
    if (!sid || !lessonDate || !lessonTime || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(priceValue) || priceValue < 0) { setCreateError("Проверьте поля формы"); return; }
    setCreating(true);
    try {
      await api.createLesson({ student_id: sid, start_at: toIso(lessonDate, lessonTime), duration_min: duration, status: "scheduled", topic: topic.trim() || null, price: priceValue });
      setIsCreateOpen(false); showToast("Занятие создано", "success"); await load();
    } catch (err) { setCreateError(err instanceof Error ? err.message : "Ошибка"); }
    finally { setCreating(false); }
  };

  const applyWeek = async () => {
    const now = new Date();
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day);
    const weekStart = monday.toISOString().slice(0, 10);
    try {
      const res = await api.applySchedule({ week_start: weekStart, days: 7, strategy: "skip_existing" });
      showToast(`Создано: ${res.created}, пропущено: ${res.skipped}`, "success");
      await load();
    } catch (err) { showToast(err instanceof Error ? err.message : "Ошибка применения расписания", "error"); }
  };

  const createSeriesRule = async () => {
    setSeriesError(null);
    const sid = Number(seriesStudentId); const duration = Number(seriesDuration); const priceValue = Number(seriesPrice);
    if (!sid || !seriesTime || duration <= 0 || priceValue < 0) { setSeriesError("Проверьте поля правила"); return; }
    try {
      await api.createLessonSeries({ student_id: sid, weekday: Number(seriesWeekday), time_of_day: `${seriesTime}:00`, duration_min: duration, topic: seriesTopic.trim() || null, price: priceValue, is_active: true });
      setIsSeriesFormOpen(false); await load();
    } catch (err) { setSeriesError(err instanceof Error ? err.message : "Ошибка создания"); }
  };

  if (loading) return <div className="rounded-xl border bg-white p-6">Загрузка...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2"><Button onClick={() => setIsCreateOpen(true)}>+ Занятие</Button><Button variant="outline" onClick={() => setIsSeriesOpen(true)}>Постоянные занятия</Button><Button variant="outline" onClick={() => void applyWeek()}>Применить расписание на эту неделю</Button></div>
    <p className="text-sm text-slate-600">Настройте постоянные уроки один раз — и каждую неделю создавайте расписание в 1 клик.</p>
    {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

    {items.map((lesson) => {
      const saving = savingLessonId === lesson.id;
      return <div key={lesson.id} className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{studentsMap.get(lesson.student_id) ?? `Ученик #${lesson.student_id}`}</p><p className="text-sm text-slate-600">{new Date(lesson.start_at).toLocaleString("ru-RU")} · {lesson.duration_min} мин · {lesson.price}₽</p></div>
          <div className="flex items-center gap-2"><span className={`${badgeBase} border-slate-200`}>{lesson.status}</span>{lesson.series_id ? <span className={`${badgeBase} border-indigo-200 bg-indigo-50 text-indigo-700`}>Постоянное</span> : null}</div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openEdit(lesson)} disabled={saving}>Редактировать</Button>
          <Button disabled={saving} onClick={() => void safeAction(lesson.id, async () => { await api.updateLesson(lesson.id, { status: "done" }); })}>Проведено</Button>
          <Button variant="outline" disabled={saving} onClick={() => setCancelTarget(lesson)}>Отменено</Button>
          <Button variant="outline" disabled={saving} onClick={() => void safeAction(lesson.id, async () => { await api.updatePayment(lesson.id, { is_paid: !(lesson.is_paid === true), paid_amount: lesson.price, paid_at: lesson.is_paid ? null : new Date().toISOString(), is_transferred: false, transferred_amount: 0, transferred_at: null }); })}>{lesson.is_paid ? "Снять оплату" : "Отметить оплачено"}</Button>
          <Button variant="outline" disabled={saving} onClick={() => void safeAction(lesson.id, async () => { await api.updateHomework(lesson.id, { text: null, link: null, is_sent: !(lesson.is_homework_sent === true), sent_at: lesson.is_homework_sent ? null : new Date().toISOString() }); })}>Домашка отправлена</Button>
        </div></div>;
    })}

    <ConfirmModal open={cancelTarget !== null} title="Точно отменить занятие?" description="После подтверждения статус занятия изменится на «Отменено»." confirmText="Да, отменить" cancelText="Нет" onConfirm={() => void (cancelTarget && safeAction(cancelTarget.id, async () => { await api.updateLesson(cancelTarget.id, { status: "canceled" }); }).finally(() => setCancelTarget(null)))} onCancel={() => setCancelTarget(null)} />

    {isCreateOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="font-semibold">Быстро создать занятие</h2><div className="mt-3 space-y-2"><select className="w-full rounded border p-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Ученик</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="date" className="rounded border p-2" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /><input type="time" className="rounded border p-2" value={lessonTime} onChange={(e) => setLessonTime(e.target.value)} /></div><div className="grid grid-cols-2 gap-2"><input type="number" min={1} className="rounded border p-2" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /><input type="number" min={0} className="rounded border p-2" value={price} onChange={(e) => setPrice(e.target.value)} /></div><input className="w-full rounded border p-2" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема" />{createError ? <p className="text-sm text-red-600">{createError}</p> : null}</div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button><Button disabled={creating} onClick={() => void handleCreateLesson()}>{creating ? "Сохраняю..." : "Создать"}</Button></div></div></div> : null}

    {isEditOpen && editLesson ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="font-semibold">Редактировать занятие</h2><div className="mt-3 space-y-2"><select className="w-full rounded border p-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="date" className="rounded border p-2" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} /><input type="time" className="rounded border p-2" value={lessonTime} onChange={(e) => setLessonTime(e.target.value)} /></div><div className="grid grid-cols-2 gap-2"><input type="number" min={1} className="rounded border p-2" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /><input type="number" min={0} className="rounded border p-2" value={price} onChange={(e) => setPrice(e.target.value)} /></div><input className="w-full rounded border p-2" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема" />{editLesson.series_id ? <div className="rounded border border-slate-200 p-2 text-sm"><p className="mb-1">Куда применить изменения?</p><label className="mr-3"><input type="radio" checked={applyMode === "single"} onChange={() => setApplyMode("single")} /> Только это занятие</label><label><input type="radio" checked={applyMode === "future"} onChange={() => setApplyMode("future")} /> Это и все будущие занятия этой постоянки</label><p className="mt-1 text-xs text-slate-500">Изменения можно применить только к этому занятию или ко всем будущим занятиям этой постоянки.</p></div> : null}{editError ? <p className="text-sm text-red-600">{editError}</p> : null}</div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button><Button onClick={() => void saveEdit()}>Сохранить</Button></div></div></div> : null}

    {isSeriesOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-3xl rounded-2xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-semibold">Постоянные занятия</h2><Button variant="outline" onClick={() => setIsSeriesOpen(false)}>Закрыть</Button></div><div className="mt-3 space-y-2">{series.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between rounded border p-2 text-sm"><span>{WEEKDAYS[rule.weekday]} {rule.time_of_day.slice(0,5)} — {studentsMap.get(rule.student_id)} — {rule.duration_min} мин — {rule.price}₽ — {rule.topic || "Без темы"}</span><div className="flex gap-2"><Button variant="outline" onClick={() => void api.updateLessonSeries(rule.id, { is_active: !rule.is_active }).then(load)}>{rule.is_active ? "Выкл" : "Вкл"}</Button><Button variant="outline" onClick={() => setDeletingSeriesId(rule.id)}>Удалить</Button></div></div>)}</div><div className="mt-4 flex gap-2"><Button onClick={() => setIsSeriesFormOpen(true)}>+ Постоянное занятие</Button><Button variant="outline" onClick={() => void applyWeek()}>Применить на эту неделю</Button></div>{isSeriesFormOpen ? <div className="mt-4 rounded border p-3"><div className="grid grid-cols-2 gap-2"><select className="rounded border p-2" value={seriesWeekday} onChange={(e) => setSeriesWeekday(e.target.value)}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select><input type="time" className="rounded border p-2" value={seriesTime} onChange={(e) => setSeriesTime(e.target.value)} /><select className="rounded border p-2" value={seriesStudentId} onChange={(e) => setSeriesStudentId(e.target.value)}><option value="">Ученик</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="number" min={1} className="rounded border p-2" value={seriesDuration} onChange={(e) => setSeriesDuration(e.target.value)} /><input type="number" min={0} className="rounded border p-2" value={seriesPrice} onChange={(e) => setSeriesPrice(e.target.value)} /><input className="rounded border p-2" value={seriesTopic} onChange={(e) => setSeriesTopic(e.target.value)} placeholder="Тема" /></div>{seriesError ? <p className="mt-2 text-sm text-red-600">{seriesError}</p> : null}<div className="mt-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setIsSeriesFormOpen(false)}>Отмена</Button><Button onClick={() => void createSeriesRule()}>Сохранить</Button></div></div> : null}</div></div> : null}

    <ConfirmModal open={deletingSeriesId !== null} title="Удалить правило постоянки?" description="Это действие удалит правило и не затронет уже созданные прошлые занятия." confirmText="Удалить" cancelText="Отмена" onCancel={() => setDeletingSeriesId(null)} onConfirm={() => void (deletingSeriesId && api.deleteLessonSeries(deletingSeriesId).then(async () => { setDeletingSeriesId(null); await load(); }))} />
  </div>;
}
