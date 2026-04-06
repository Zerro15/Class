import { clearToken, getToken, isAuthRoute } from "@/lib/api-session";
import type { FinanceFilters } from "@/lib/api-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;

  if (!isAuthRoute(window.location.pathname)) {
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

export async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
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
      clearToken();
      redirectToLoginIfNeeded();
    }

    throw await parseApiError(res);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export function toQueryString(filters: FinanceFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
}
