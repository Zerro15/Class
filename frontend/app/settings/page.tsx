"use client";

import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/app/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { api, type UserSettings } from "@/lib/api";

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 rounded-full bg-slate-100" />
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-12 rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl border border-slate-200 bg-white/90 shadow-sm" />
        ))}
      </div>
      <div className="h-80 rounded-[32px] border border-slate-200 bg-white/90 shadow-sm" />
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [me, userSettings] = await Promise.all([api.me(), api.getSettings()]);
        setEmail(me.email);
        setSettings(userSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки настроек");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const summary = useMemo(() => {
    if (!settings) return null;
    return {
      duration: `${settings.default_lesson_duration_min} мин`,
      price: `${settings.default_lesson_price} ₽`,
      hours: `${settings.workday_start} - ${settings.workday_end}`,
    };
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateSettings({
        default_lesson_duration_min: settings.default_lesson_duration_min,
        default_lesson_price: settings.default_lesson_price,
        workday_start: settings.workday_start,
        workday_end: settings.workday_end,
        week_start: settings.week_start,
        timezone: settings.timezone,
      });
      setSettings(updated);
      showToast("Настройки сохранены", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка сохранения";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings || !summary) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-sky-200">Настройки</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">Параметры рабочего режима и профиля</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Настройте базовые значения уроков, рабочие часы и календарную логику так, чтобы интерфейс сразу открывался в удобном для вас формате.
            </p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-sky-700">Профиль</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Аккаунт</h2>
          <label className="mt-6 block text-sm font-medium text-slate-700">
            Email
            <input className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700 outline-none" value={email} readOnly />
          </label>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            Email сейчас используется как идентификатор входа. Дополнительных настроек профиля пока нет, но страница уже готова к расширению.
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard title="Урок по умолчанию" value={summary.duration} hint="Базовая длительность нового занятия" />
        <StatCard title="Базовая цена" value={summary.price} hint="Подставляется при создании уроков" />
        <StatCard title="Рабочее окно" value={summary.hours} hint="Используется календарем и расписанием" />
      </section>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">Рабочие параметры</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Расписание и календарь</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Эти значения влияют на календарь, быстрое создание занятий и общие значения по умолчанию в интерфейсе.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Длительность урока по умолчанию
            <input
              type="number"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.default_lesson_duration_min}
              onChange={(event) => setSettings({ ...settings, default_lesson_duration_min: Number(event.target.value) })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Цена урока по умолчанию
            <input
              type="number"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.default_lesson_price}
              onChange={(event) => setSettings({ ...settings, default_lesson_price: Number(event.target.value) })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Рабочее время: с
            <input
              type="time"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.workday_start}
              onChange={(event) => setSettings({ ...settings, workday_start: event.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Рабочее время: до
            <input
              type="time"
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.workday_end}
              onChange={(event) => setSettings({ ...settings, workday_end: event.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Начало недели
            <select
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.week_start}
              onChange={(event) => setSettings({ ...settings, week_start: event.target.value as UserSettings["week_start"] })}
            >
              <option value="monday">Понедельник</option>
              <option value="sunday">Воскресенье</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Часовой пояс
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={settings.timezone}
              onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void save()} disabled={saving} className="h-12 rounded-2xl bg-sky-600 px-6 text-white hover:bg-sky-700">
            {saving ? "Сохраняем..." : "Сохранить настройки"}
          </Button>
        </div>
      </section>
    </div>
  );
}
