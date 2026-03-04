"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Student {
  id: number;
  name: string;
  notes: string | null;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [topic, setTopic] = useState("");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Комментарий наставника: useCallback стабилизирует ссылку на load, чтобы useEffect корректно отслеживал зависимость без предупреждений линтера.
  const load = useCallback(async () => {
    try {
      const data = await api.getStudent(params.id);
      setStudent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.createLesson({
        student_id: Number(params.id),
        start_at: new Date(startAt).toISOString(),
        duration_min: duration,
        status: "scheduled",
        topic,
        price
      });
      setTopic("");
      setStartAt("");
      setDuration(60);
      setPrice(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
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
        <h2 className="text-lg font-semibold">Создать занятие</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateLesson}>
          <label className="text-sm">
            Дата и время
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            Тема
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Длительность, мин
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>
          <label className="text-sm">
            Цена
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
            />
          </label>
          <Button type="submit">Создать</Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
