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

interface StudentOption {
  id: number;
  name: string;
}

interface LessonSeries {
  id: number;
  student_id: number;
  weekday: number;
  time_of_day: string;
  duration_min: number;
  topic?: string | null;
  price: number;
  is_active: boolean;
}

type LessonFormState = {
  studentId: string;
  lessonDate: string;
  lessonTime: string;
  durationMin: string;
  price: string;
  topic: string;
};

type SeriesFormState = {
  weekday: string;
  time: string;
  studentId: string;
  duration: string;
  price: string;
  topic: string;
};

const badgeBase = "rounded-full border px-2.5 py-1 text-xs font-medium";
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const STATUS_LABELS: Record<Lesson["status"], string> = {
  scheduled: "Запланировано",
  done: "Проведено",
  canceled: "Отменено",
};

const emptyLessonForm = (): LessonFormState => ({
  studentId: "",
  lessonDate: "",
  lessonTime: "",
  durationMin: "60",
  price: "0",
  topic: "",
});

const emptySeriesForm = (): SeriesFormState => ({
  weekday: "0",
  time: "18:00",
  studentId: "",
  duration: "60",
  price: "0",
  topic: "",
});

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
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

function getLessonStatusTone(status: Lesson["status"]) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "canceled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getLessonSummary(items: Lesson[]) {
  const scheduled = items.filter((item) => item.status === "scheduled").length;
  const paid = items.filter((item) => item.is_paid).length;
  const homeworkSent = items.filter((item) => item.is_homework_sent).length;
  return { scheduled, paid, homeworkSent };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-6 flex gap-3">
            <div className="h-12 w-40 rounded-2xl bg-slate-100" />
            <div className="h-12 w-48 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-3xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function DashboardStatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function DashboardActionBar({
  onCreate,
  onOpenSeries,
  onApplyWeek,
}: {
  onCreate: () => void;
  onOpenSeries: () => void;
  onApplyWeek: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Dashboard</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">Ближайшие занятия и недельный ритм в одном экране</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Быстро отмечайте оплату и домашку, редактируйте уроки на лету и разворачивайте постоянное расписание на неделю в один клик.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onCreate} className="h-12 rounded-2xl bg-sky-500 px-5 text-white hover:bg-sky-400">
              + Новое занятие
            </Button>
            <Button variant="outline" onClick={onOpenSeries} className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/15">
              Постоянные занятия
            </Button>
            <Button variant="outline" onClick={onApplyWeek} className="h-12 rounded-2xl border-white/20 bg-white/10 px-5 text-white hover:bg-white/15">
              Применить расписание на неделю
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Как это использовать</p>
        <div className="mt-4 space-y-3">
          {[
            "Добавьте или отредактируйте ближайшее занятие прямо из списка.",
            "Для регулярных уроков заведите постоянку один раз и разворачивайте неделю автоматически.",
            "Финансовые и учебные отметки меняются без перехода на другие страницы.",
          ].map((point) => (
            <div key={point} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
              <p className="text-sm leading-6 text-slate-600">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonCard({
  lesson,
  studentName,
  saving,
  onEdit,
  onDone,
  onCancel,
  onTogglePaid,
  onToggleHomework,
}: {
  lesson: Lesson;
  studentName: string;
  saving: boolean;
  onEdit: () => void;
  onDone: () => void;
  onCancel: () => void;
  onTogglePaid: () => void;
  onToggleHomework: () => void;
}) {
  return (
    <article className="rounded-[30px] border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-slate-900">{studentName}</h3>
            <span className={`${badgeBase} ${getLessonStatusTone(lesson.status)}`}>{STATUS_LABELS[lesson.status]}</span>
            {lesson.series_id ? (
              <span className={`${badgeBase} border-indigo-200 bg-indigo-50 text-indigo-700`}>Постоянное</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-600">{formatLessonDate(lesson.start_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              {lesson.duration_min} мин
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              {lesson.price} ₽
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-sm ${
                lesson.is_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {lesson.is_paid ? "Оплачено" : "Не оплачено"}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-sm ${
                lesson.is_homework_sent ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {lesson.is_homework_sent ? "Домашка отправлена" : "Домашка не отправлена"}
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {lesson.topic?.trim() ? lesson.topic : "Тема занятия пока не указана."}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
          <Button variant="outline" onClick={onEdit} disabled={saving} className="rounded-2xl">
            Редактировать
          </Button>
          <Button onClick={onDone} disabled={saving} className="rounded-2xl">
            Проведено
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving} className="rounded-2xl">
            Отменить
          </Button>
          <Button variant="outline" onClick={onTogglePaid} disabled={saving} className="rounded-2xl">
            {lesson.is_paid ? "Снять оплату" : "Отметить оплачено"}
          </Button>
          <Button variant="outline" onClick={onToggleHomework} disabled={saving} className="rounded-2xl">
            {lesson.is_homework_sent ? "Снять отметку ДЗ" : "Домашка отправлена"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function LessonFormFields({
  form,
  students,
  onChange,
}: {
  form: LessonFormState;
  students: StudentOption[];
  onChange: (patch: Partial<LessonFormState>) => void;
}) {
  const inputClass =
    "mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Ученик
        <select className={inputClass} value={form.studentId} onChange={(event) => onChange({ studentId: event.target.value })}>
          <option value="">Выберите ученика</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Дата
          <input className={inputClass} type="date" value={form.lessonDate} onChange={(event) => onChange({ lessonDate: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Время
          <input className={inputClass} type="time" value={form.lessonTime} onChange={(event) => onChange({ lessonTime: event.target.value })} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Длительность, мин
          <input
            className={inputClass}
            type="number"
            min={1}
            value={form.durationMin}
            onChange={(event) => onChange({ durationMin: event.target.value })}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Цена
          <input className={inputClass} type="number" min={0} value={form.price} onChange={(event) => onChange({ price: event.target.value })} />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Тема
        <input className={inputClass} value={form.topic} onChange={(event) => onChange({ topic: event.target.value })} placeholder="Например, тригонометрия" />
      </label>
    </div>
  );
}

function LessonModal({
  open,
  title,
  description,
  students,
  form,
  error,
  saving,
  applyMode,
  showApplyMode,
  onChange,
  onApplyModeChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  students: StudentOption[];
  form: LessonFormState;
  error: string | null;
  saving: boolean;
  applyMode: "single" | "future";
  showApplyMode: boolean;
  onChange: (patch: Partial<LessonFormState>) => void;
  onApplyModeChange: (value: "single" | "future") => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-700">Урок</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            Закрыть
          </Button>
        </div>

        <div className="mt-6">
          <LessonFormFields form={form} students={students} onChange={onChange} />
        </div>

        {showApplyMode ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">Куда применить изменения?</p>
            <div className="mt-3 flex flex-col gap-2 text-slate-600 sm:flex-row">
              <label className="flex items-center gap-2">
                <input type="radio" checked={applyMode === "single"} onChange={() => onApplyModeChange("single")} />
                Только это занятие
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={applyMode === "future"} onChange={() => onApplyModeChange("future")} />
                Это и будущие занятия серии
              </label>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={saving} className="rounded-2xl">
            {saving ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeriesModal({
  open,
  series,
  studentsMap,
  deletingSeriesId,
  isSeriesFormOpen,
  form,
  error,
  onClose,
  onToggleActive,
  onDelete,
  onOpenForm,
  onApplyWeek,
  onFormChange,
  onCloseForm,
  onSubmitForm,
}: {
  open: boolean;
  series: LessonSeries[];
  studentsMap: Map<number, string>;
  deletingSeriesId: number | null;
  isSeriesFormOpen: boolean;
  form: SeriesFormState;
  error: string | null;
  onClose: () => void;
  onToggleActive: (rule: LessonSeries) => void;
  onDelete: (id: number) => void;
  onOpenForm: () => void;
  onApplyWeek: () => void;
  onFormChange: (patch: Partial<SeriesFormState>) => void;
  onCloseForm: () => void;
  onSubmitForm: () => void;
}) {
  if (!open) return null;

  const inputClass =
    "h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Постоянное расписание</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Регулярные занятия</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Здесь хранятся шаблоны недели. Вы можете включать и выключать правила, а затем разворачивать их в обычные занятия.
            </p>
          </div>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">
            Закрыть
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {series.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-slate-900">Постоянных занятий пока нет</p>
              <p className="mt-2 text-sm text-slate-500">Создайте первое правило и начните собирать неделю автоматически.</p>
            </div>
          ) : (
            series.map((rule) => (
              <div key={rule.id} className="rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">
                        {WEEKDAYS[rule.weekday]} {rule.time_of_day.slice(0, 5)}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          rule.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {rule.is_active ? "Активно" : "Выключено"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {studentsMap.get(rule.student_id) ?? `Ученик #${rule.student_id}`} · {rule.duration_min} мин · {rule.price} ₽
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{rule.topic?.trim() || "Без темы"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => onToggleActive(rule)} className="rounded-2xl">
                      {rule.is_active ? "Выключить" : "Включить"}
                    </Button>
                    <Button variant="outline" onClick={() => onDelete(rule.id)} className="rounded-2xl" disabled={deletingSeriesId === rule.id}>
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onOpenForm} className="rounded-2xl">
            + Новое правило
          </Button>
          <Button variant="outline" onClick={onApplyWeek} className="rounded-2xl">
            Применить на эту неделю
          </Button>
        </div>

        {isSeriesFormOpen ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-lg font-semibold text-slate-900">Новое постоянное занятие</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <select className={inputClass} value={form.weekday} onChange={(event) => onFormChange({ weekday: event.target.value })}>
                {WEEKDAYS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <input className={inputClass} type="time" value={form.time} onChange={(event) => onFormChange({ time: event.target.value })} />
              <select className={inputClass} value={form.studentId} onChange={(event) => onFormChange({ studentId: event.target.value })}>
                <option value="">Ученик</option>
                {Array.from(studentsMap.entries()).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <input className={inputClass} type="number" min={1} value={form.duration} onChange={(event) => onFormChange({ duration: event.target.value })} />
              <input className={inputClass} type="number" min={0} value={form.price} onChange={(event) => onFormChange({ price: event.target.value })} />
              <input className={inputClass} value={form.topic} onChange={(event) => onFormChange({ topic: event.target.value })} placeholder="Тема" />
            </div>

            {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={onCloseForm} className="rounded-2xl">
                Отмена
              </Button>
              <Button onClick={onSubmitForm} className="rounded-2xl">
                Сохранить правило
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const [createForm, setCreateForm] = useState<LessonFormState>(emptyLessonForm);
  const [editForm, setEditForm] = useState<LessonFormState>(emptyLessonForm);
  const [applyMode, setApplyMode] = useState<"single" | "future">("single");
  const [seriesForm, setSeriesForm] = useState<SeriesFormState>(emptySeriesForm);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const { showToast } = useToast();

  const studentsMap = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students]);
  const summary = useMemo(() => getLessonSummary(items), [items]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcoming, studentsData, seriesData] = await Promise.all([
        api.getUpcoming(7),
        api.listStudents(),
        api.listLessonSeries(),
      ]);
      setItems(upcoming.items);
      setStudents(studentsData.map((student) => ({ id: student.id, name: student.name })));
      setSeries(seriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки занятий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const safeAction = async (lessonId: number, action: () => Promise<void>) => {
    setActionError(null);
    setSavingLessonId(lessonId);
    try {
      await action();
      await load();
      showToast("Сохранено", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить изменения";
      setActionError(message);
      showToast(`Ошибка: ${message}`, "error");
    } finally {
      setSavingLessonId(null);
    }
  };

  const openCreate = () => {
    setCreateForm(emptyLessonForm());
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    const dt = new Date(lesson.start_at);
    setEditLesson(lesson);
    setEditForm({
      studentId: String(lesson.student_id),
      lessonDate: dt.toISOString().slice(0, 10),
      lessonTime: dt.toISOString().slice(11, 16),
      durationMin: String(lesson.duration_min),
      price: String(lesson.price),
      topic: lesson.topic ?? "",
    });
    setApplyMode("single");
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleCreateLesson = async () => {
    const sid = Number(createForm.studentId);
    const duration = Number(createForm.durationMin);
    const priceValue = Number(createForm.price);

    if (
      !sid ||
      !createForm.lessonDate ||
      !createForm.lessonTime ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(priceValue) ||
      priceValue < 0
    ) {
      setCreateError("Проверьте поля формы");
      return;
    }

    setCreating(true);
    try {
      await api.createLesson({
        student_id: sid,
        start_at: toIso(createForm.lessonDate, createForm.lessonTime),
        duration_min: duration,
        status: "scheduled",
        topic: createForm.topic.trim() || null,
        price: priceValue,
      });
      setIsCreateOpen(false);
      setCreateForm(emptyLessonForm());
      showToast("Занятие создано", "success");
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Ошибка создания занятия");
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editLesson) return;

    const sid = Number(editForm.studentId);
    const duration = Number(editForm.durationMin);
    const priceValue = Number(editForm.price);

    if (
      !sid ||
      !editForm.lessonDate ||
      !editForm.lessonTime ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(priceValue) ||
      priceValue < 0
    ) {
      setEditError("Проверьте поля формы");
      return;
    }

    await safeAction(editLesson.id, async () => {
      const patch = {
        student_id: sid,
        start_at: toIso(editForm.lessonDate, editForm.lessonTime),
        duration_min: duration,
        topic: editForm.topic.trim() || null,
        price: priceValue,
      };

      if (editLesson.series_id && applyMode === "future") {
        await api.updateLesson(editLesson.id, { ...patch, apply_to_future: true });
      } else {
        await api.updateLesson(editLesson.id, patch);
      }
    });

    setIsEditOpen(false);
    setEditLesson(null);
  };

  const applyWeek = async () => {
    const now = new Date();
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day);
    const weekStart = monday.toISOString().slice(0, 10);

    try {
      const result = await api.applySchedule({ week_start: weekStart, days: 7, strategy: "skip_existing" });
      showToast(`Создано: ${result.created}, пропущено: ${result.skipped}`, "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка применения расписания", "error");
    }
  };

  const createSeriesRule = async () => {
    setSeriesError(null);
    const sid = Number(seriesForm.studentId);
    const duration = Number(seriesForm.duration);
    const priceValue = Number(seriesForm.price);

    if (!sid || !seriesForm.time || duration <= 0 || priceValue < 0) {
      setSeriesError("Проверьте поля правила");
      return;
    }

    try {
      await api.createLessonSeries({
        student_id: sid,
        weekday: Number(seriesForm.weekday),
        time_of_day: `${seriesForm.time}:00`,
        duration_min: duration,
        topic: seriesForm.topic.trim() || null,
        price: priceValue,
        is_active: true,
      });
      setSeriesForm(emptySeriesForm());
      setIsSeriesFormOpen(false);
      showToast("Правило создано", "success");
      await load();
    } catch (err) {
      setSeriesError(err instanceof Error ? err.message : "Ошибка создания правила");
    }
  };

  const toggleSeriesActive = async (rule: LessonSeries) => {
    try {
      await api.updateLessonSeries(rule.id, { is_active: !rule.is_active });
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось обновить правило", "error");
    }
  };

  const deleteSeriesRule = async (id: number) => {
    setDeletingSeriesId(id);
    try {
      await api.deleteLessonSeries(id, "detach");
      setDeletingSeriesId(null);
      await load();
      showToast("Правило удалено", "success");
    } catch (err) {
      setDeletingSeriesId(null);
      showToast(err instanceof Error ? err.message : "Не удалось удалить правило", "error");
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <DashboardActionBar onCreate={openCreate} onOpenSeries={() => setIsSeriesOpen(true)} onApplyWeek={() => void applyWeek()} />

      <section className="grid gap-3 md:grid-cols-3">
        <DashboardStatCard label="Ближайшие занятия" value={String(items.length)} hint="Период: 7 дней" />
        <DashboardStatCard label="Запланировано" value={String(summary.scheduled)} hint="Еще не проведены и не отменены" />
        <DashboardStatCard label="Оплачено / ДЗ" value={`${summary.paid} / ${summary.homeworkSent}`} hint="Финансы и учебный follow-up" />
      </section>

      {actionError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Расписание</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Ближайшие занятия</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Рабочий список на ближайшие 7 дней. Все основные действия доступны прямо из карточки урока.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">Ближайших занятий пока нет</p>
            <p className="mt-2 text-sm text-slate-500">Создайте первое занятие вручную или разверните постоянное расписание на неделю.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((lesson) => {
              const saving = savingLessonId === lesson.id;
              const studentName = studentsMap.get(lesson.student_id) ?? `Ученик #${lesson.student_id}`;

              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  studentName={studentName}
                  saving={saving}
                  onEdit={() => openEdit(lesson)}
                  onDone={() =>
                    void safeAction(lesson.id, async () => {
                      await api.updateLesson(lesson.id, { status: "done" });
                    })
                  }
                  onCancel={() => setCancelTarget(lesson)}
                  onTogglePaid={() =>
                    void safeAction(lesson.id, async () => {
                      await api.updatePayment(lesson.id, {
                        is_paid: !(lesson.is_paid === true),
                        paid_amount: lesson.price,
                        paid_at: lesson.is_paid ? null : new Date().toISOString(),
                        is_transferred: false,
                        transferred_amount: 0,
                        transferred_at: null,
                      });
                    })
                  }
                  onToggleHomework={() =>
                    void safeAction(lesson.id, async () => {
                      await api.updateHomework(lesson.id, {
                        text: null,
                        link: null,
                        is_sent: !(lesson.is_homework_sent === true),
                        sent_at: lesson.is_homework_sent ? null : new Date().toISOString(),
                      });
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        open={cancelTarget !== null}
        title="Точно отменить занятие?"
        description="После подтверждения статус занятия изменится на «Отменено»."
        confirmText="Да, отменить"
        cancelText="Нет"
        onConfirm={() =>
          void (
            cancelTarget &&
            safeAction(cancelTarget.id, async () => {
              await api.updateLesson(cancelTarget.id, { status: "canceled" });
            }).finally(() => setCancelTarget(null))
          )
        }
        onCancel={() => setCancelTarget(null)}
      />

      <LessonModal
        open={isCreateOpen}
        title="Быстро создать занятие"
        description="Создайте единичный урок и сразу добавьте его в расписание."
        students={students}
        form={createForm}
        error={createError}
        saving={creating}
        applyMode="single"
        showApplyMode={false}
        onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
        onApplyModeChange={() => undefined}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={() => void handleCreateLesson()}
      />

      <LessonModal
        open={isEditOpen && editLesson !== null}
        title="Редактировать занятие"
        description="Измените дату, ученика, длительность или стоимость урока."
        students={students}
        form={editForm}
        error={editError}
        saving={savingLessonId === editLesson?.id}
        applyMode={applyMode}
        showApplyMode={Boolean(editLesson?.series_id)}
        onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
        onApplyModeChange={setApplyMode}
        onClose={() => setIsEditOpen(false)}
        onSubmit={() => void saveEdit()}
      />

      <SeriesModal
        open={isSeriesOpen}
        series={series}
        studentsMap={studentsMap}
        deletingSeriesId={deletingSeriesId}
        isSeriesFormOpen={isSeriesFormOpen}
        form={seriesForm}
        error={seriesError}
        onClose={() => setIsSeriesOpen(false)}
        onToggleActive={(rule) => void toggleSeriesActive(rule)}
        onDelete={(id) => setDeletingSeriesId(id)}
        onOpenForm={() => {
          setSeriesError(null);
          setSeriesForm(emptySeriesForm());
          setIsSeriesFormOpen(true);
        }}
        onApplyWeek={() => void applyWeek()}
        onFormChange={(patch) => setSeriesForm((current) => ({ ...current, ...patch }))}
        onCloseForm={() => setIsSeriesFormOpen(false)}
        onSubmitForm={() => void createSeriesRule()}
      />

      <ConfirmModal
        open={deletingSeriesId !== null}
        title="Удалить правило постоянки?"
        description="Шаблон будет удален, а уже созданные занятия останутся в календаре как обычные уроки без связи с серией."
        confirmText="Удалить"
        cancelText="Отмена"
        onCancel={() => setDeletingSeriesId(null)}
        onConfirm={() => void (deletingSeriesId && deleteSeriesRule(deletingSeriesId))}
      />
    </div>
  );
}
