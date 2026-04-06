"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Student {
  id: number;
  name: string;
  notes: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function pluralizeStudents(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "ученик";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ученика";
  return "учеников";
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        tone === "accent" ? "border-sky-200 bg-sky-50/80" : "border-slate-200 bg-white/90"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StudentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-12 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-24 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm" />
        ))}
      </div>
      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-3 h-24 rounded-3xl bg-slate-100 last:mb-0" />
        ))}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listStudents();
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить учеников");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!normalizedSearch) return students;
    return students.filter((student) => {
      const haystack = `${student.name} ${student.notes || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, students]);

  const studentsWithNotes = useMemo(() => students.filter((student) => Boolean(student.notes?.trim())).length, [students]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedNotes = notes.trim();

    if (!normalizedName) {
      setError("Имя ученика обязательно");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.createStudent({ name: normalizedName, notes: normalizedNotes || null });
      setName("");
      setNotes("");
      showToast("Ученик добавлен", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось создать ученика";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      setSearch(value);
    });
  };

  if (loading) {
    return <StudentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Ученики</p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold leading-tight">База учеников без хаоса и таблиц</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Держите контакты и заметки в одном месте, быстро находите нужного ученика и переходите в карточку без лишних кликов.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-sky-100">Сейчас в базе</p>
                <p className="mt-2 text-2xl font-semibold">
                  {students.length} {pluralizeStudents(students.length)}
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 px-6 py-5 sm:px-8">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block text-sm font-medium text-slate-700">
                Поиск по имени и заметкам
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  placeholder="Например, ЕГЭ, олимпиада, английский"
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </label>
              <div className="flex items-end">
                <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:w-auto">
                  Показано: <span className="font-semibold text-slate-900">{filteredStudents.length}</span>
                </div>
              </div>
            </div>
            {error ? (
              <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-sky-700">Быстрое добавление</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Новый ученик</h2>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              +1 запись
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleCreate}>
            <label className="block text-sm font-medium text-slate-700">
              Имя
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="Например, Анна Смирнова"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Заметки
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="Класс, цель, формат занятий, важные детали"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <Button type="submit" disabled={saving} className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              {saving ? "Сохраняю..." : "Создать ученика"}
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Всего учеников" value={String(students.length)} tone="accent" />
        <StatCard label="С заметками" value={String(studentsWithNotes)} />
        <StatCard label="Без заметок" value={String(students.length - studentsWithNotes)} />
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Список учеников</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {filteredStudents.length} {pluralizeStudents(filteredStudents.length)}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Откройте карточку ученика, чтобы создать занятие и продолжить работу уже в контексте конкретного человека.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">Пока нет ни одного ученика</p>
            <p className="mt-2 text-sm text-slate-500">Добавьте первого ученика справа, и список начнет заполняться.</p>
          </div>
        ) : null}

        {students.length > 0 && filteredStudents.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">Ничего не найдено</p>
            <p className="mt-2 text-sm text-slate-500">Попробуйте убрать часть запроса или искать по ключевым словам из заметок.</p>
          </div>
        ) : null}

        {filteredStudents.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {filteredStudents.map((student) => (
              <article
                key={student.id}
                className="group rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(248,250,252,0.95)_100%)] p-5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(student.name) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{student.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {student.notes?.trim() ? "Есть рабочие заметки" : "Заметок пока нет"}
                        </p>
                      </div>
                      <Link
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                        href={`/students/${student.id}`}
                      >
                        Открыть карточку
                      </Link>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {student.notes?.trim() ? student.notes : "Добавьте заметки: уровень, цели, формат занятий, домашние правила."}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
