"use client";

import { useEffect, useState } from "react";

import { ConfirmModal } from "@/app/components/ConfirmModal";
import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Lesson {
  id: number;
  student_id: number;
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

const STATUS_LABELS: Record<Lesson["status"], string> = {
  scheduled: "Запланировано",
  done: "Проведено",
  canceled: "Отменено",
};

const badgeBase = "rounded-full border px-2.5 py-1 text-xs font-medium";

export default function DashboardPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Lesson | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonTime, setLessonTime] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [price, setPrice] = useState("0");
  const [topic, setTopic] = useState("");
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUpcoming(7);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки занятий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const safeAction = async (lessonId: number, fn: () => Promise<void>) => {
    // ⚠️ Частая ошибка: не блокировать кнопки во время запроса — пользователь может запустить действие несколько раз.
    setActionError(null);
    setSavingLessonId(lessonId);
    try {
      await fn();
      await load();
      showToast("Сохранено", "success");
    } catch (err) {
      console.error("Ошибка действия на дашборде", err);
      const message = err instanceof Error ? err.message : "Не удалось сохранить изменения";
      setActionError(message);
      showToast(`Ошибка: ${message}`, "error");
    } finally {
      setSavingLessonId(null);
    }
  };

  const toggleStatus = async (lesson: Lesson) => {
    if (lesson.status === "scheduled") {
      return;
    }

    await safeAction(lesson.id, async () => {
      await api.updateLesson(lesson.id, { status: "scheduled" });
    });
  };

  const confirmCancelLesson = async () => {
    if (!cancelTarget) return;
    const lesson = cancelTarget;
    setCancelTarget(null);
    await safeAction(lesson.id, async () => {
      await api.updateLesson(lesson.id, { status: "canceled" });
    });
  };

  const markDone = async (lesson: Lesson) => {
    await safeAction(lesson.id, async () => {
      await api.updateLesson(lesson.id, { status: "done" });
    });
  };

  const togglePaid = async (lesson: Lesson) => {
    await safeAction(lesson.id, async () => {
      const isPaid = lesson.is_paid === true;
      // 🧠 Почему так: при снятии оплаты сразу сбрасываем перевод, чтобы не оставлять нелогичное состояние «переведено без оплаты».
      await api.updatePayment(
        lesson.id,
        isPaid
          ? {
              is_paid: false,
              paid_amount: 0,
              paid_at: null,
              is_transferred: false,
              transferred_amount: 0,
              transferred_at: null,
            }
          : {
              is_paid: true,
              paid_amount: lesson.price > 0 ? lesson.price : 0,
              paid_at: new Date().toISOString(),
            },
      );
    });
  };

  const toggleHomework = async (lesson: Lesson) => {
    await safeAction(lesson.id, async () => {
      const isSent = lesson.is_homework_sent === true;
      // ✅ Ожидаемое поведение: text/link не перезаписываем, чтобы toggle менял только флаг отправки и время.
      await api.updateHomework(lesson.id, {
        text: null,
        link: null,
        is_sent: !isSent,
        sent_at: isSent ? null : new Date().toISOString(),
      });
    });
  };

  const resetCreateForm = () => {
    setStudentId("");
    setLessonDate("");
    setLessonTime("");
    setDurationMin("60");
    setPrice("0");
    setTopic("");
    setCreateError(null);
  };

  const openCreateModal = async () => {
    setIsCreateOpen(true);
    setCreateError(null);
    if (students.length > 0 || studentsLoading) return;

    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const list = await api.listStudents();
      setStudents(list.map((item) => ({ id: item.id, name: item.name })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить учеников";
      setStudentsError(message);
      showToast(`Ошибка: ${message}`, "error");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    const parsedStudentId = Number(studentId);
    const parsedDuration = Number(durationMin);
    const parsedPrice = Number(price);

    if (!parsedStudentId) {
      setCreateError("Выберите ученика");
      return;
    }

    if (!lessonDate || !lessonTime) {
      setCreateError("Заполните дату и время");
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setCreateError("Длительность должна быть больше 0");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setCreateError("Цена не может быть отрицательной");
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      // 🧠 Почему так: собираем local date+time в Date и отправляем ISO, чтобы сервер всегда получил момент времени в UTC.
      const startAt = new Date(`${lessonDate}T${lessonTime}`);
      if (Number.isNaN(startAt.getTime())) {
        setCreateError("Некорректная дата или время");
        return;
      }

      await api.createLesson({
        student_id: parsedStudentId,
        start_at: startAt.toISOString(),
        duration_min: parsedDuration,
        status: "scheduled",
        topic: topic.trim() ? topic.trim() : null,
        price: parsedPrice,
      });

      setIsCreateOpen(false);
      resetCreateForm();
      showToast("Занятие создано", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать занятие";
      setCreateError(message);
      showToast(`Ошибка: ${message}`, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Ближайшие занятия (7 дней)</h1>
          <Button type="button" onClick={() => void openCreateModal()}>
            + Занятие
          </Button>
        </div>
        {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}
        {loading ? <p className="mt-4 text-sm">Загрузка...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Нет запланированных занятий.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((lesson) => {
          const saving = savingLessonId === lesson.id;
          const isPaid = lesson.is_paid === true;
          const isHomeworkSent = lesson.is_homework_sent === true;
          return (
            <div key={lesson.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
                  <p className="font-medium">{lesson.topic || "Без темы"}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`${badgeBase} border-slate-300 bg-slate-50 text-slate-700`}>
                      Статус: {STATUS_LABELS[lesson.status]}
                    </span>
                    {lesson.is_paid !== undefined && lesson.is_paid !== null ? (
                      <span
                        className={`${badgeBase} ${lesson.is_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                      >
                        Оплата: {lesson.is_paid ? "оплачено" : "не оплачено"}
                      </span>
                    ) : null}
                    {lesson.is_homework_sent !== undefined && lesson.is_homework_sent !== null ? (
                      <span
                        className={`${badgeBase} ${lesson.is_homework_sent ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-slate-50 text-slate-700"}`}
                      >
                        Домашка: {lesson.is_homework_sent ? "отправлена" : "не отправлена"}
                      </span>
                    ) : null}
                  </div>
                  <a className="text-xs text-slate-600 hover:text-slate-900" href={`/lessons/${lesson.id}`}>
                    Открыть занятие
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson.status === "scheduled" ? (
                    <>
                      <Button size="default" variant="outline" disabled={saving} onClick={() => void markDone(lesson)}>
                        {saving ? "Сохраняю..." : "Проведено"}
                      </Button>
                      <Button size="default" variant="outline" disabled={saving} onClick={() => setCancelTarget(lesson)}>
                        {saving ? "Сохраняю..." : "Отменено"}
                      </Button>
                    </>
                  ) : null}

                  {lesson.status === "done" ? (
                    <Button size="default" variant="outline" disabled={saving} onClick={() => void toggleStatus(lesson)}>
                      {saving ? "Сохраняю..." : "Вернуть в Запланировано"}
                    </Button>
                  ) : null}

                  {lesson.status === "canceled" ? (
                    <Button size="default" variant="outline" disabled={saving} onClick={() => void toggleStatus(lesson)}>
                      {saving ? "Сохраняю..." : "Восстановить"}
                    </Button>
                  ) : null}

                  <Button size="default" variant={isPaid ? "outline" : "default"} disabled={saving} onClick={() => void togglePaid(lesson)}>
                    {saving ? "Сохраняю..." : isPaid ? "Снять оплату" : "Отметить оплачено"}
                  </Button>
                  <Button size="default" variant="outline" disabled={saving} onClick={() => void toggleHomework(lesson)}>
                    {saving ? "Сохраняю..." : isHomeworkSent ? "Снять \"отправлена\"" : "Домашка отправлена"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={cancelTarget !== null}
        title="Точно отменить занятие?"
        description="После подтверждения статус занятия изменится на «Отменено»."
        confirmText="Да, отменить"
        cancelText="Нет"
        onConfirm={() => void confirmCancelLesson()}
        onCancel={() => setCancelTarget(null)}
      />

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Быстро создать занятие</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Ученик</span>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  disabled={studentsLoading || creating}
                >
                  <option value="">Выберите ученика</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Дата</span>
                  <input
                    type="date"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={lessonDate}
                    onChange={(event) => setLessonDate(event.target.value)}
                    disabled={creating}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Время</span>
                  <input
                    type="time"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={lessonTime}
                    onChange={(event) => setLessonTime(event.target.value)}
                    disabled={creating}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Длительность (мин)</span>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={durationMin}
                    onChange={(event) => setDurationMin(event.target.value)}
                    disabled={creating}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Цена</span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    disabled={creating}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Тема (опционально)</span>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  disabled={creating}
                />
              </label>

              {studentsError ? <p className="text-sm text-red-600">{studentsError}</p> : null}
              {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => {
                  setIsCreateOpen(false);
                  resetCreateForm();
                }}
              >
                Отмена
              </Button>
              <Button type="button" disabled={creating} onClick={() => void handleCreateLesson()}>
                {creating ? "Сохраняю..." : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
