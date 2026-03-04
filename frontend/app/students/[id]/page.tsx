"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { api, type Lesson } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Student {
  id: number;
  name: string;
  notes: string | null;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topic, setTopic] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [studentData, lessonsData] = await Promise.all([
        api.getStudent(params.id),
        api.listStudentLessons(params.id),
      ]);
      setStudent(studentData);
      setLessons(lessonsData);
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
      // Формируем payload аккуратно: пустые optional поля не отправляем.
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return <p className="text-sm">{error ? error : "Загрузка..."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{student.name}</h1>
        {student.notes ? <p className="text-sm text-slate-600">{student.notes}</p> : null}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Add lesson</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateLesson}>
          <label className="text-sm">
            starts_at
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            topic
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
          </label>
          <label className="text-sm md:col-span-2">
            notes
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <label className="text-sm">
            homework text (optional)
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={homeworkText}
              onChange={(event) => setHomeworkText(event.target.value)}
            />
          </label>
          <label className="text-sm">
            payment amount (optional)
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={0}
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
          </label>
          <label className="text-sm">
            duration min
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create lesson"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Lessons</h2>
        {lessons.length === 0 ? <p className="mt-3 text-sm text-slate-600">Нет занятий.</p> : null}
        <ul className="mt-4 space-y-3">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="rounded border p-3">
              <p className="text-sm text-slate-500">{new Date(lesson.start_at).toLocaleString()}</p>
              <p className="font-medium">{lesson.topic || "Без темы"}</p>
              {lesson.notes ? <p className="text-sm text-slate-600">{lesson.notes}</p> : null}
              <p className="text-xs text-slate-500">
                Homework: {lesson.homework ? lesson.homework.status : "none"} · Payment: {lesson.payment ? lesson.payment.status : "none"}
              </p>
              <Link className="text-xs text-slate-700 hover:text-slate-900" href={`/lessons/${lesson.id}`}>
                Открыть занятие
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
