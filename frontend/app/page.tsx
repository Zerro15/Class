import Link from "next/link";

export default function HomePage() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">ClassFlow MVP</h1>
      <p className="mt-2 text-sm text-slate-600">
        Перейдите к дашборду или войдите в аккаунт.
      </p>
      <div className="mt-4 flex gap-3">
        <Link className="rounded bg-slate-900 px-4 py-2 text-sm text-white" href="/login">
          Войти
        </Link>
        <Link className="rounded border px-4 py-2 text-sm" href="/register">
          Регистрация
        </Link>
      </div>
    </div>
  );
}
