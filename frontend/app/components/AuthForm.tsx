"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api, ApiError, clearToken, getToken, setToken, subscribeToSessionChange } from "@/lib/api";

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

  const title = isLogin ? "Вход" : "Регистрация";
  const subtitle = isLogin
    ? "Откройте расписание, учеников и финансы в одном рабочем пространстве."
    : "Создайте аккаунт и сразу начните вести учеников, уроки и оплаты.";
  const asideTitle = isLogin ? "Рабочее место преподавателя" : "Быстрый старт без лишней настройки";
  const asidePoints = isLogin
    ? ["Ближайшие занятия и календарь", "Ученики, домашка и история", "Оплаты и переводы без таблиц"]
    : ["Регистрация занимает меньше минуты", "Настройки и налог сохраняются на аккаунт", "Данные готовы для роста дальше MVP"];

  useEffect(() => {
    let cancelled = false;

    const validateSavedSession = async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setCheckingSession(false);
        }
        return;
      }

      try {
        await api.me();
        if (!cancelled) {
          router.replace("/dashboard");
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
        }
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    };

    void validateSavedSession();

    const unsubscribe = subscribeToSessionChange(() => {
      void validateSavedSession();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
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

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
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
      const response = isLogin
        ? await api.login(normalizedEmail, password)
        : await api.register(normalizedEmail, password);
      setToken(response.access_token);
      await api.me();
      router.replace("/dashboard");
    } catch (err) {
      setError(isLogin ? getLoginErrorText(err) : getRegisterErrorText(err));
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-slate-200/70 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="h-3 w-24 rounded-full bg-slate-200" />
            <div className="h-10 w-3/4 rounded-2xl bg-slate-200" />
            <div className="h-4 w-full rounded-full bg-slate-100" />
            <div className="h-4 w-5/6 rounded-full bg-slate-100" />
          </div>
          <div className="space-y-3">
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-12 rounded-2xl bg-slate-100" />
            <div className="h-12 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_30%)]" />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-sky-300">ClassFlow</p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight lg:text-4xl">{asideTitle}</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">{subtitle}</p>
            <div className="mt-8 space-y-3">
              {asidePoints.map((point) => (
                <div key={point} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                  <span className="text-sm text-slate-100">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-8 sm:py-10">
          <form className="mx-auto w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <p className="text-sm font-medium text-sky-700">{isLogin ? "С возвращением" : "Новый аккаунт"}</p>
              <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
              <p className="text-sm leading-6 text-slate-500">
                {isLogin ? "Войдите, чтобы продолжить работу." : "Заполните данные и перейдите в рабочую панель."}
              </p>
            </div>

            <label className="block text-sm font-semibold text-slate-800">
              Email
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Пароль
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                type="password"
                placeholder={isLogin ? "Введите пароль" : "Минимум 8 символов"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </label>

            {!isLogin ? (
              <label className="block text-sm font-semibold text-slate-800">
                Подтвердите пароль
                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            ) : null}

            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
            >
              {loading ? "Обработка..." : isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>

            {isLogin ? (
              <Link
                href="/register"
                className="block rounded-2xl border border-slate-300 py-3 text-center text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Создать аккаунт
              </Link>
            ) : (
              <p className="text-center text-sm text-slate-500">
                Уже есть аккаунт?{" "}
                <Link href="/login" className="font-medium text-sky-700 hover:underline">
                  Войти
                </Link>
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
