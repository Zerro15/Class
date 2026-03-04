"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { api, type Student } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/app/components/SearchInput";
import { useToast } from "@/app/components/ToastProvider";

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-100 px-0.5">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

export default function StudentsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [pricePerHour, setPricePerHour] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listStudents({ q: search || undefined, include_inactive: showAll });
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [search, showAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createStudent({ name, notes: notes || null, price_per_hour: Number(pricePerHour) || 0 });
      setName("");
      setNotes("");
      setPricePerHour("0");
      showToast("Ученик создан");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      showToast("Не удалось создать ученика", "error");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => ({
    active: students.filter((s) => s.is_active).length,
    all: students.length,
  }), [students]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ученики</h1>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
          <input className="rounded border px-3 py-2" placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} required />
          <input className="rounded border px-3 py-2" placeholder="Заметки" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <input className="rounded border px-3 py-2" type="number" min={0} step="0.01" placeholder="Ставка в час, ₽" value={pricePerHour} onChange={(event) => setPricePerHour(event.target.value)} />
          <Button type="submit" disabled={saving}>{saving ? "Сохраняю..." : "Создать ученика"}</Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Список</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
            Показать неактивных
          </label>
        </div>
        <div className="mt-3">
          <SearchInput placeholder="Поиск по имени или заметкам" value={search} onChange={setSearch} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Активных: {totals.active} · Всего в списке: {totals.all}</p>
        {loading ? <p className="mt-3 text-sm">Загрузка...</p> : null}
        {!loading && students.length === 0 ? <p className="mt-3 text-sm text-slate-600">Ничего не найдено.</p> : null}
        <ul className="mt-4 space-y-3">
          {students.map((student) => (
            <li key={student.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{highlightText(student.name, search)}</p>
                {student.notes ? <p className="text-xs text-slate-500">{highlightText(student.notes, search)}</p> : null}
                <p className="text-xs text-slate-500">Ставка: {student.price_per_hour.toFixed(2)} ₽/ч</p>
                {!student.is_active ? <p className="text-xs text-red-600">Ученик в архиве</p> : null}
              </div>
              <Link className="text-sm text-slate-600 hover:text-slate-900" href={`/students/${student.id}`}>Карточка</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
