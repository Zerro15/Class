"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, homeworkStatusLabel, lessonStatusLabel, paymentStatusLabel, type Lesson, type StudentBalance, type Student } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/app/components/StatusBadge";
import { useToast } from "@/app/components/ToastProvider";
import { ConfirmModal } from "@/app/components/ConfirmModal";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [balance, setBalance] = useState<StudentBalance | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topic, setTopic] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [studentData, lessonsData, balanceData] = await Promise.all([
        api.getStudent(params.id),
        api.listStudentLessons(params.id),
        api.getStudentBalance(params.id),
      ]);
      setStudent(studentData);
      setLessons(lessonsData);
      setBalance(balanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createStudentLesson(params.id, {
        starts_at: new Date(startsAt).toISOString(),
        topic,
        notes: notes || null,
        duration_min: duration,
        ...(homeworkText ? { homework_text: homeworkText } : {}),
        ...(paymentAmount ? { payment_amount: Number(paymentAmount) } : {}),
      });
      setTopic("");
      setStartsAt("");
      setNotes("");
      setHomeworkText("");
      setPaymentAmount("");
      setDuration(60);
      showToast("Занятие создано");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось создать занятие", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    setRemoving(true);
    try {
      await api.deleteStudent(params.id);
      showToast("Ученик перенесён в архив");
      router.push("/students");
    } catch {
      showToast("Не удалось удалить ученика", "error");
    } finally {
      setRemoving(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleRestore = async () => {
    try {
      await api.restoreStudent(params.id);
      showToast("Ученик восстановлен");
      await load();
    } catch {
      showToast("Не удалось восстановить ученика", "error");
    }
  };

  if (!student) return <p className="text-sm">{error || "Загрузка..."}</p>;

  const upcoming = lessons.filter((lesson) => ["scheduled", "rescheduled"].includes(lesson.status));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{student.name}</h1>
            {student.notes ? <p className="text-sm text-slate-600">{student.notes}</p> : null}
            <p className="text-sm text-slate-500">Ставка: {student.price_per_hour.toFixed(2)} ₽/ч</p>
            {!student.is_active ? <p className="text-sm text-red-600">Ученик в архиве</p> : null}
          </div>
          {student.is_active ? (
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setConfirmDeleteOpen(true)}>
              Удалить студента
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRestore}>Восстановить</Button>
          )}
        </div>
        {balance ? (
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <p>Начислено: <b>{balance.charged_total.toFixed(2)} ₽</b></p>
            <p>Оплачено: <b>{balance.paid_total.toFixed(2)} ₽</b></p>
            <p>Долг: <b className={balance.debt > 0 ? "text-red-600" : "text-emerald-600"}>{balance.debt.toFixed(2)} ₽</b></p>
          </div>
        ) : null}
      </div>

      {student.is_active ? (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Добавить занятие</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateLesson}>
            <label className="text-sm">Дата и время<input className="mt-1 w-full rounded border px-3 py-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></label>
            <label className="text-sm">Тема<input className="mt-1 w-full rounded border px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} required /></label>
            <label className="text-sm md:col-span-2">Заметки<textarea className="mt-1 w-full rounded border px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <label className="text-sm">Домашка<input className="mt-1 w-full rounded border px-3 py-2" value={homeworkText} onChange={(e) => setHomeworkText(e.target.value)} /></label>
            <label className="text-sm">Цена урока (опц.)<input className="mt-1 w-full rounded border px-3 py-2" type="number" min={0} step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></label>
            <label className="text-sm">Длительность (мин)<input className="mt-1 w-full rounded border px-3 py-2" type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} required /></label>
            <Button type="submit" disabled={submitting}>{submitting ? "Сохраняю..." : "Создать занятие"}</Button>
          </form>
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Предстоящие уроки</h2>
        <ul className="mt-4 space-y-2">
          {upcoming.map((lesson) => (
            <li key={lesson.id} className="rounded border p-3">
              <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
              <p className="font-medium">{lesson.topic || "Без темы"}</p>
              <StatusBadge label={lessonStatusLabel[lesson.status]} />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Все уроки</h2>
        <ul className="mt-4 space-y-3">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="rounded border p-3">
              <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
              <p className="font-medium">{lesson.topic || "Без темы"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={lessonStatusLabel[lesson.status]} />
                {lesson.homework ? <StatusBadge label={`Домашка: ${homeworkStatusLabel[lesson.homework.status]}`} tone="warning" /> : null}
                {lesson.payment ? <StatusBadge label={`Оплата: ${paymentStatusLabel[lesson.payment.status]}`} tone={lesson.payment.status === "paid" ? "success" : "danger"} /> : null}
              </div>
              <Link className="mt-2 inline-flex text-xs text-slate-700 hover:text-slate-900" href={`/lessons/${lesson.id}`}>Открыть карточку занятия</Link>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Удаление ученика"
        description="Точно удалить? Это скроет ученика из активного списка, но сохранит уроки и платежи в истории."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteStudent}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={removing}
      />
    </div>
  );
}
