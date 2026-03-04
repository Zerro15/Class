"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api, type Lesson } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.requestLesson(Number(params.id));
      setLesson(data);
      setTopic(data.topic || "");
      setNotes(data.notes || "");
      setStartsAt(data.start_at.slice(0, 16));
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const handleDoneHomework = async () => {
    try {
      await api.markHomeworkDone(Number(params.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleMarkPaid = async () => {
    try {
      await api.markPaymentPaid(Number(params.id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить занятие? Это действие нельзя отменить.")) return;
    try {
      await api.deleteLesson(Number(params.id));
      router.push("/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  if (!lesson) {
    return <p className="text-sm">{error ? error : "Загрузка..."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Lesson #{lesson.id}</h1>
        <p className="text-sm text-slate-600">{new Date(lesson.start_at).toLocaleString()}</p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Edit lesson</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            topic
            <input className="mt-1 w-full rounded border px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            notes
            <textarea className="mt-1 w-full rounded border px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="text-sm">
            starts_at
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Workflow</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {lesson.homework && lesson.homework.status === "todo" ? (
            <Button variant="outline" onClick={handleDoneHomework}>Mark homework done</Button>
          ) : null}
          {lesson.payment && lesson.payment.status === "unpaid" ? (
            <Button variant="outline" onClick={handleMarkPaid}>Mark paid</Button>
          ) : null}
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDelete}>
            Delete lesson
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
