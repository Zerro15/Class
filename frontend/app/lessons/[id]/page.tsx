"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, homeworkStatusLabel, lessonStatusLabel, paymentStatusLabel, type Lesson, type LessonStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useToast } from "@/app/components/ToastProvider";

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newStartAt, setNewStartAt] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [notifyStudent, setNotifyStudent] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("перевод");
  const [paymentComment, setPaymentComment] = useState("");

  const load = async () => {
    try {
      const data = await api.requestLesson(Number(params.id));
      setLesson(data);
      setTopic(data.topic || "");
      setNotes(data.notes || "");
      setStartsAt(data.start_at.slice(0, 16));
      setNewStartAt(data.start_at.slice(0, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateLesson(Number(params.id), {
        starts_at: new Date(startsAt).toISOString(),
        topic,
        notes,
      });
      showToast("Изменения сохранены");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось сохранить изменения", "error");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: LessonStatus) => {
    try {
      await api.updateLesson(Number(params.id), { status });
      showToast("Статус урока обновлён");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось обновить статус", "error");
    }
  };

  const handleReschedule = async () => {
    try {
      await api.rescheduleLesson(Number(params.id), {
        new_start_at: new Date(newStartAt).toISOString(),
        reason: rescheduleReason || undefined,
        notify_student: notifyStudent,
      });
      showToast("Занятие перенесено");
      setRescheduleOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось перенести занятие", "error");
    }
  };

  const handleDoneHomework = async () => {
    try {
      await api.markHomeworkDone(Number(params.id));
      showToast("Домашка отмечена как проверенная");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось обновить домашку", "error");
    }
  };

  const handleMarkPaid = async () => {
    try {
      if (paymentAmount) {
        await api.createPaymentTransaction({
          student_id: lesson!.student_id,
          lesson_id: Number(params.id),
          amount: Number(paymentAmount),
          method: paymentMethod,
          comment: paymentComment || undefined,
        });
      } else {
        await api.markPaymentPaid(Number(params.id));
      }
      showToast("Оплата сохранена");
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось сохранить оплату", "error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Точно отменить и удалить занятие?")) return;
    try {
      await api.deleteLesson(Number(params.id));
      showToast("Занятие удалено");
      router.push("/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось удалить занятие", "error");
    }
  };

  if (!lesson) {
    return <p className="text-sm">{error ? error : "Загрузка..."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Занятие #{lesson.id}</h1>
        <p className="text-sm text-slate-600">{new Date(lesson.start_at).toLocaleString()}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge label={lessonStatusLabel[lesson.status]} />
          {lesson.homework ? <StatusBadge label={`Домашка: ${homeworkStatusLabel[lesson.homework.status]}`} tone="warning" /> : null}
          {lesson.payment ? <StatusBadge label={`Оплата: ${paymentStatusLabel[lesson.payment.status]}`} tone={lesson.payment.status === "paid" ? "success" : "danger"} /> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Редактировать занятие</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            Тема
            <input className="mt-1 w-full rounded border px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            Заметки
            <textarea className="mt-1 w-full rounded border px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="text-sm">
            Дата и время
            <input className="mt-1 w-full rounded border px-3 py-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Действия</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => changeStatus("completed")}>Проведён</Button>
          <Button variant="outline" onClick={() => changeStatus("no_show")}>Неявка</Button>
          <Button variant="outline" onClick={() => setRescheduleOpen(true)}>Перенести</Button>
          {lesson.homework && lesson.homework.status !== "reviewed" ? (
            <Button variant="outline" onClick={handleDoneHomework}>Домашка проверена</Button>
          ) : null}
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>Внести оплату</Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDelete}>Удалить занятие</Button>
        </div>
      </div>

      {rescheduleOpen ? (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Перенос занятия</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Новая дата и время
              <input className="mt-1 w-full rounded border px-3 py-2" type="datetime-local" value={newStartAt} onChange={(e) => setNewStartAt(e.target.value)} />
            </label>
            <label className="text-sm md:col-span-2">
              Причина (опционально)
              <textarea className="mt-1 w-full rounded border px-3 py-2" rows={2} value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyStudent} onChange={(e) => setNotifyStudent(e.target.checked)} />
              Отметить «уведомить ученика»
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleReschedule}>Сохранить перенос</Button>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Отмена</Button>
          </div>
        </div>
      ) : null}

      {paymentOpen ? (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Внести оплату</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Сумма
              <input className="mt-1 w-full rounded border px-3 py-2" type="number" min={0} step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Оставьте пустым для полной оплаты" />
            </label>
            <label className="text-sm">
              Способ оплаты
              <select className="mt-1 w-full rounded border px-3 py-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="наличные">Наличные</option>
                <option value="перевод">Перевод</option>
                <option value="карта">Карта</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              Комментарий
              <input className="mt-1 w-full rounded border px-3 py-2" value={paymentComment} onChange={(e) => setPaymentComment(e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleMarkPaid}>Сохранить оплату</Button>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Отмена</Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
