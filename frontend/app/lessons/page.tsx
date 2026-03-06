import Link from "next/link";

export default function LessonsPage() {
  return (
    <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Уроки</h1>
      <p className="text-sm text-slate-600">
        Список уроков сейчас доступен в календаре и в карточках на дашборде.
      </p>
      <div className="flex gap-3">
        <Link href="/calendar" className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Открыть календарь
        </Link>
        <Link href="/dashboard" className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Открыть дашборд
        </Link>
      </div>
    </div>
  );
}
