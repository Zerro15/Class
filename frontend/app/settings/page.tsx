"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, UserSettings } from "@/lib/api";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <p className="text-sm text-slate-500">Загрузка...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Настройки</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-base font-semibold">Профиль</h2>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-600">Email</span>
          <input className="w-full rounded border bg-slate-50 px-3 py-2 text-slate-700" value={email} readOnly />
        </label>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-base font-semibold">Настройки расписания</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Длительность урока по умолчанию (мин)</span>
            <input type="number" className="w-full rounded border px-3 py-2" value={settings.default_lesson_duration_min} onChange={(e) => setSettings({ ...settings, default_lesson_duration_min: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Цена урока по умолчанию</span>
            <input type="number" className="w-full rounded border px-3 py-2" value={settings.default_lesson_price} onChange={(e) => setSettings({ ...settings, default_lesson_price: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Рабочее время: с</span>
            <input type="time" className="w-full rounded border px-3 py-2" value={settings.workday_start} onChange={(e) => setSettings({ ...settings, workday_start: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Рабочее время: до</span>
            <input type="time" className="w-full rounded border px-3 py-2" value={settings.workday_end} onChange={(e) => setSettings({ ...settings, workday_end: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Начало недели</span>
            <select className="w-full rounded border px-3 py-2" value={settings.week_start} onChange={(e) => setSettings({ ...settings, week_start: e.target.value as UserSettings["week_start"] })}>
              <option value="monday">Понедельник</option>
              <option value="sunday">Воскресенье</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Часовой пояс</span>
            <input className="w-full rounded border px-3 py-2" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-base font-semibold">Интерфейс</h2>
        <p className="mt-2 text-sm text-slate-600">Палитра и структура интерфейса синхронизированы с новым sidebar layout.</p>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
      </div>
    </div>
  );
}
