const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "classflow_token";

export interface ApiErrorShape {
  status: number;
  message: string;
}

export class ApiError extends Error {
  status: number;

  constructor({ status, message }: ApiErrorShape) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;

  const isAuthRoute = window.location.pathname === "/login" || window.location.pathname === "/register";
  // Комментарий наставника: на страницах авторизации не редиректим повторно, чтобы не создавать циклы переходов.
  if (!isAuthRoute) {
    window.location.href = "/login";
  }
}

function normalizeDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const maybeMsg = (entry as { msg?: unknown }).msg;
          const maybeLoc = (entry as { loc?: unknown }).loc;
          const loc = Array.isArray(maybeLoc) ? maybeLoc.join(" → ") : "поле";
          if (typeof maybeMsg === "string") {
            return `${loc}: ${maybeMsg}`;
          }
        }
        return "Заполните корректно поля формы";
      })
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    const detailText = Object.values(detail as Record<string, unknown>)
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(", ");
    return detailText || "Ошибка в данных";
  }

  return "Ошибка в данных";
}

async function parseApiError(res: Response): Promise<ApiError> {
  const text = await res.text();

  try {
    const json = JSON.parse(text) as { detail?: unknown };
    if (json.detail !== undefined) {
      return new ApiError({ status: res.status, message: normalizeDetail(json.detail) });
    }
    return new ApiError({ status: res.status, message: normalizeDetail(json) });
  } catch {
    // ignore JSON parse error
  }

  return new ApiError({ status: res.status, message: text || `HTTP ${res.status}` });
}

// Комментарий наставника: единый request убирает дублирование и гарантирует единое поведение токена/ошибок по всему приложению.
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  const hasBody = opts.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Комментарий наставника: при невалидной сессии сразу чистим токен, чтобы приложение не жило в «битом» состоянии.
      clearToken();
      redirectToLoginIfNeeded();
    }

    throw await parseApiError(res);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

interface LessonPayload {
  student_id: number;
  start_at: string;
  duration_min: number;
  status: string;
  topic: string | null;
  price: number;
}

export interface LessonItem {
  id: number;
  student_id: number;
  student_name?: string | null;
  start_at: string;
  duration_min: number;
  status: "scheduled" | "done" | "canceled";
  topic?: string | null;
  price: number;
  is_archived: boolean;
  is_paid?: boolean | null;
  is_homework_sent?: boolean | null;
  series_id?: number | null;
}

export interface UserSettings {
  id: number;
  owner_id: number;
  default_lesson_duration_min: number;
  default_lesson_price: number;
  workday_start: string;
  workday_end: string;
  week_start: "monday" | "sunday";
  timezone: string;
}

export interface LessonSeriesItem {
  id: number;
  owner_id: number;
  student_id: number;
  weekday: number;
  start_time?: string;
  time_of_day?: string;
  duration_min: number;
  topic: string | null;
  price: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  is_active?: boolean;
}

interface LessonSeriesBackendPayload {
  student_id: number;
  weekday: number;
  start_time: string;
  duration_min: number;
  topic: string | null;
  price: number;
  start_date: string;
  end_date: string | null;
}

type LessonSeriesCreatePayload = LessonSeriesBackendPayload & {
  time_of_day?: string;
  is_active?: boolean;
};

type LessonSeriesPatchPayload = Partial<LessonSeriesCreatePayload> & { apply_to_future?: boolean };

function normalizeSeriesItem(item: LessonSeriesItem): LessonSeriesItem {
  const canonicalStartTime = item.start_time ?? item.time_of_day ?? "00:00:00";
  return {
    ...item,
    start_time: canonicalStartTime,
    // Комментарий наставника: dashboard исторически работал с time_of_day, поэтому дублируем поле через adapter-слой и не ломаем старый UI.
    time_of_day: item.time_of_day ?? canonicalStartTime,
    is_active: item.is_active ?? true,
  };
}

function mapSeriesCreatePayload(payload: LessonSeriesCreatePayload): LessonSeriesBackendPayload {
  return {
    student_id: payload.student_id,
    weekday: payload.weekday,
    // Почему так: backend хранит start_time, а часть UI всё ещё отправляет time_of_day.
    start_time: payload.start_time ?? payload.time_of_day ?? "00:00:00",
    duration_min: payload.duration_min,
    topic: payload.topic,
    price: payload.price,
    start_date: payload.start_date,
    end_date: payload.end_date,
  };
}

function mapSeriesPatchPayload(payload: LessonSeriesPatchPayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if (payload.student_id !== undefined) mapped.student_id = payload.student_id;
  if (payload.weekday !== undefined) mapped.weekday = payload.weekday;
  if (payload.duration_min !== undefined) mapped.duration_min = payload.duration_min;
  if (payload.topic !== undefined) mapped.topic = payload.topic;
  if (payload.price !== undefined) mapped.price = payload.price;
  if (payload.start_date !== undefined) mapped.start_date = payload.start_date;
  if (payload.end_date !== undefined) mapped.end_date = payload.end_date;
  if (payload.apply_to_future !== undefined) mapped.apply_to_future = payload.apply_to_future;
  if (payload.start_time !== undefined || payload.time_of_day !== undefined) {
    mapped.start_time = payload.start_time ?? payload.time_of_day;
  }
  // Важный момент: is_active нужен для backward-compat типов dashboard, но текущий backend это поле не хранит.
  return mapped;
}

export interface FinanceFilters {
  from?: string;
  to?: string;
  student_id?: number;
  paid?: boolean;
  transferred?: boolean;
  archived?: boolean;
}

function toQueryString(filters: FinanceFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
}

export const api = {
  login(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me() {
    return request<{ id: number; email: string }>("/api/v1/auth/me");
  },
  listStudents() {
    return request<Array<{ id: number; name: string; notes: string | null }>>("/api/v1/students");
  },
  createStudent(payload: { name: string; notes: string | null }) {
    return request<{ id: number; name: string; notes: string | null }>("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getStudent(id: string) {
    return request<{ id: number; name: string; notes: string | null }>(`/api/v1/students/${id}`);
  },
  createLesson(payload: LessonPayload) {
    return request<{ id: number }>("/api/v1/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getUpcoming(days: number) {
    return request<{
      items: Array<{
        id: number;
        student_id: number;
        start_at: string;
        duration_min: number;
        status: "scheduled" | "done" | "canceled";
        topic?: string | null;
        price: number;
        is_paid?: boolean | null;
        is_homework_sent?: boolean | null;
      }>;
    }>(`/api/v1/dashboard/upcoming?days=${days}`);
  },
  listLessons(filters: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const qs = params.toString();
    return request<LessonItem[]>(`/api/v1/lessons${qs ? `?${qs}` : ""}`);
  },
  requestLesson(id: number) {
    return request<{
      id: number;
      start_at: string;
      duration_min: number;
      status: string;
      topic?: string | null;
      price: number;
      is_archived: boolean;
    }>(`/api/v1/lessons/${id}`);
  },
  // Комментарий наставника: payload объединяет поля из dashboard/calendar/recurring, чтобы один клиент не терял возможности после merge разных веток.
  updateLesson(id: number, payload: { status?: string; is_archived?: boolean; start_at?: string; duration_min?: number; topic?: string | null; price?: number; student_id?: number; apply_to_future?: boolean }) {
    return request<{ id: number }>(`/api/v1/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updatePayment(
    id: number,
    payload: {
      is_paid: boolean;
      paid_amount: number;
      paid_at: string | null;
      is_transferred?: boolean;
      transferred_amount?: number;
      transferred_at?: string | null;
    },
  ) {
    return request<{ ok: boolean }>(`/api/v1/lessons/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updateHomework(
    id: number,
    payload: { text: string | null; link: string | null; is_sent: boolean; sent_at: string | null },
  ) {
    return request<{ ok: boolean }>(`/api/v1/lessons/${id}/homework`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  financeSummary(filters: FinanceFilters) {
    return request<{
      income_paid: number;
      debt_unpaid: number;
      transferred_sum: number;
      not_transferred_sum: number;
      lessons_count: number;
    }>(`/api/v1/finance/summary${toQueryString(filters)}`);
  },
  financeItems(filters: FinanceFilters) {
    return request<{
      items: Array<{
        lesson_id: number;
        student_id: number;
        student_name: string;
        start_at: string;
        status: string;
        topic: string | null;
        price: number;
        is_archived: boolean;
        is_paid: boolean;
        paid_amount: number;
        paid_at: string | null;
        is_transferred: boolean;
        transferred_amount: number;
        transferred_at: string | null;
      }>;
    }>(`/api/v1/finance/items${toQueryString(filters)}`);
  },
  getSettings() {
    return request<UserSettings>("/api/v1/settings");
  },
  updateSettings(payload: Omit<UserSettings, "id" | "owner_id">) {
    return request<UserSettings>("/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  listLessonSeries() {
    return request<LessonSeriesItem[]>("/api/v1/lesson-series").then((items) => items.map(normalizeSeriesItem));
  },
  createLessonSeries(payload: LessonSeriesCreatePayload) {
    return request<LessonSeriesItem>("/api/v1/lesson-series", {
      method: "POST",
      body: JSON.stringify(mapSeriesCreatePayload(payload)),
    }).then(normalizeSeriesItem);
  },
  updateLessonSeries(id: number, payload: LessonSeriesPatchPayload) {
    return request<LessonSeriesItem>(`/api/v1/lesson-series/${id}`, {
      method: "PATCH",
      body: JSON.stringify(mapSeriesPatchPayload(payload)),
    }).then(normalizeSeriesItem);
  },
  applySeriesPatch(id: number, payload: LessonSeriesPatchPayload) {
    return this.updateLessonSeries(id, payload);
  },
  applySeriesSchedule(id: number) {
    return request<{ created: number }>(`/api/v1/lesson-series/${id}/apply-schedule`, {
      method: "POST",
    });
  },
  async applySchedule(payload: { include_inactive?: boolean } = {}) {
    const seriesList = await this.listLessonSeries();
    // Комментарий наставника: совместимый адаптер имитирует старый массовый apply, агрегируя вызовы по сериям и сохраняя новый endpoint applySeriesSchedule(id).
    const candidates = payload.include_inactive ? seriesList : seriesList.filter((item) => item.is_active !== false);
    let created = 0;
    for (const series of candidates) {
      const result = await this.applySeriesSchedule(series.id);
      created += result.created;
    }
    return { created };
  },
  deleteLessonSeries(id: number) {
    return request<{ ok: boolean }>(`/api/v1/lesson-series/${id}`, {
      method: "DELETE",
    });
  },
};
