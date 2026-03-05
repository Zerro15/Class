"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api, ApiError, clearToken, getToken, setToken } from "@/lib/api";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const title = useMemo(() => (isLogin ? "Вход" : "Регистрация"), [isLogin]);

  useEffect(() => {
    const validateSavedSession = async () => {
      const token = getToken();
      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        // Комментарий наставника: перед автологином всегда проверяем /auth/me, чтобы не доверять устаревшему токену из localStorage.
        await api.me();
        router.replace("/dashboard");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
        }
        setCheckingSession(false);
      }
    };

    validateSavedSession();
  }, [router]);

  const getLoginErrorText = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      return "Неверный email или пароль";
    }
    return "Ошибка сервера. Попробуйте позже";
  };

  const getRegisterErrorText = (err: unknown) => {
    if (err instanceof ApiError && err.message.includes("Email already registered")) {
      return "Email уже зарегистрирован";
    }
    return "Ошибка сервера. Попробуйте позже";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email обязателен");
      return;
    }

    if (!isLogin) {
      if (password.length < 8) {
        setError("Пароль должен содержать минимум 8 символов");
        return;
      }
      if (password !== confirmPassword) {
        setError("Пароль и подтверждение должны совпадать");
        return;
      }
    }

    setLoading(true);
    try {
      const response = isLogin ? await api.login(email, password) : await api.register(email, password);
      setToken(response.access_token);
      // Комментарий наставника: дополнительный вызов /auth/me подтверждает, что токен действительно рабочий до входа в защищённые экраны.
      await api.me();
      router.push("/dashboard");
    } catch (err) {
      setError(isLogin ? getLoginErrorText(err) : getRegisterErrorText(err));
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="py-10 text-center text-sm text-slate-500">Проверяем сессию...</div>;
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl border border-slate-200 bg-white px-8 py-14">
      <div className="absolute right-[-2.5rem] top-7">
        <div className="rounded-sm bg-yellow-400 px-8 py-10 text-sm font-semibold text-slate-900 shadow">{title}</div>
      </div>

      <form className="mx-auto w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <h1 className="mb-10 text-center text-xl font-semibold text-slate-900">{title}</h1>

        <label className="block text-sm font-semibold text-slate-800">
          Email
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            type="email"
            placeholder="Введите ваш email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Пароль
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            type="password"
            placeholder="Введите ваш пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {!isLogin ? (
          <label className="block text-sm font-semibold text-slate-800">
            Подтвердите пароль
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {loading ? "Обработка..." : isLogin ? "Войти" : "Зарегистрироваться"}
        </Button>

        {isLogin ? (
          <Link
            href="/register"
            className="block rounded-md border border-slate-300 py-2 text-center text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Создать аккаунт
          </Link>
        ) : (
          <p className="text-center text-sm text-blue-600">
            <Link href="/login" className="font-medium hover:underline">
              Уже есть аккаунт? Войти
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
