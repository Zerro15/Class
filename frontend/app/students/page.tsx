"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Student {
  id: number;
  name: string;
  notes: string | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listStudents();
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 250);
    return () => window.clearTimeout(id);
  }, [search]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch) return students;
    return students.filter((student) => {
      const haystack = `${student.name} ${student.notes || ""}`.toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [students, debouncedSearch]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.createStudent({ name, notes: notes || null });
      setName("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ученики</h1>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
          <input
            className="rounded border px-3 py-2"
            placeholder="Имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Заметки"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">Создать ученика</Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Список</h2>
        <div className="mt-4">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Поиск по имени/заметкам"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? <p className="mt-3 text-sm">Загрузка...</p> : null}
        {!loading && students.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Пока нет учеников.</p>
        ) : null}
        {!loading && students.length > 0 && filteredStudents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Ничего не найдено. Попробуйте изменить запрос.</p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {filteredStudents.map((student) => (
            <li key={student.id} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium">{student.name}</p>
                {student.notes ? <p className="text-xs text-slate-500">{student.notes}</p> : null}
              </div>
              <Link className="text-sm text-slate-600 hover:text-slate-900" href={`/students/${student.id}`}>
                Карточка
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
