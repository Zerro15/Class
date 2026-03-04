"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api, tokenStorage } from "@/lib/api";
import { useToast } from "@/app/components/ToastProvider";

type AuthMode = "login" | "register";

function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const cardTitle = useMemo(() => (isRegister ? "Создание аккаунта" : "Вход в систему"), [isRegister]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);

    // Комментарий наставника: синхронизируем режим с URL, чтобы ссылкой /login?mode=register можно было открыть нужную вкладку сразу.
    const nextQuery = nextMode === "register" ? "?mode=register" : "";
    router.replace(`/login${nextQuery}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      const msg = "Пароли не совпадают";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setLoading(true);
    try {
      const res = isRegister ? await api.register(email, password) : await api.login(email, password);
      tokenStorage.set(res.access_token);
      showToast(isRegister ? "Аккаунт создан" : "Успешный вход", "success");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:grid-cols-2">
        <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-700 p-8 text-white md:p-10">
          <h1 className="text-3xl font-bold">ClassFlow</h1>
          <p className="mt-3 text-sm text-indigo-100">Управляйте обучением в одном месте: быстро, удобно и красиво.</p>
          <ul className="mt-8 space-y-3 text-sm text-indigo-100">
            <li>• Единая панель для занятий, учеников и финансов</li>
            <li>• Быстрый вход и регистрация без лишних переходов</li>
            <li>• Приятный интерфейс с акцентом на фокус преподавателя</li>
          </ul>
        </section>

        <section className="bg-white p-6 md:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 rounded-xl bg-slate-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    !isRegister
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isRegister
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
                  }`}
                >
                  Регистрация
                </button>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-900">{cardTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isRegister ? "Заполните поля, чтобы создать новый аккаунт." : "Введите данные, чтобы продолжить работу."}
            </p>

            <form className="mt-6 space-y-4 transition-all duration-200" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm outline-none transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Введите ваш email"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Пароль
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm outline-none transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Введите ваш пароль"
                  required
                />
              </label>

              {isRegister ? (
                <label className="block text-sm font-medium text-slate-700 transition-all duration-200">
                  Повтор пароля
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm outline-none transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Повторите пароль"
                    required
                  />
                </label>
              ) : null}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-lg bg-indigo-600 text-white transition duration-200 hover:bg-indigo-700"
              >
                {loading ? (isRegister ? "Создаю…" : "Вхожу…") : isRegister ? "Зарегистрироваться" : "Войти"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // Комментарий наставника: Suspense нужен для корректной работы useSearchParams в Next.js App Router на этапе сборки.
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Загрузка формы...</div>}>
      <AuthScreen />
    </Suspense>
  );
}
