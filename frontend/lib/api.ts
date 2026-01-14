import type {
  ApiListResponse,
  CreateLessonInput,
  CreateStudentInput,
  HomeworkUpdate,
  Lesson,
  LessonUpdate,
  PaymentUpdate,
  Student,
} from "@/lib/types";

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const INTERNAL_API_URL =
  process.env.API_INTERNAL_URL ?? "http://backend:8000";

export const API_URL =
  typeof window === "undefined" ? INTERNAL_API_URL : PUBLIC_API_URL;
export const TOKEN_KEY = "classflow_token";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 1;
const isDev = process.env.NODE_ENV !== "production";

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

type RequestOptions = RequestInit & {
  json?: unknown;
  timeoutMs?: number;
  retries?: number;
};

type ParsedBody = {
  data: unknown | null;
  text: string;
  isJson: boolean;
};

function buildUrl(path: string) {
  const base = API_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function maybeWarn(message: string, error?: unknown) {
  if (!isDev) return;
  if (error) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

async function parseResponseBody(res: Response): Promise<ParsedBody> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!text) {
    return { data: null, text: "", isJson };
  }

  if (!isJson) {
    return { data: null, text, isJson: false };
  }

  try {
    return { data: JSON.parse(text), text, isJson: true };
  } catch {
    return { data: null, text, isJson: true };
  }
}

function buildErrorMessage(res: Response, parsed: ParsedBody) {
  if (parsed.isJson && parsed.data && typeof parsed.data === "object") {
    const detail = (parsed.data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail !== undefined) return JSON.stringify(detail);
    return JSON.stringify(parsed.data);
  }

  if (parsed.text) return parsed.text;
  return `HTTP ${res.status}`;
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const retries = opts.retries ?? DEFAULT_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const headers = new Headers(opts.headers || {});
    headers.set("Accept", "application/json");

    const token = tokenStorage.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let body = opts.body;
    if (opts.json !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(opts.json);
    }

    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (opts.signal) {
      if (opts.signal.aborted) {
        controller.abort();
      } else {
        opts.signal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    try {
      const res = await fetch(buildUrl(path), {
        ...opts,
        headers,
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          maybeWarn(`Retrying ${path} after ${res.status}`);
          continue;
        }
        const parsed = await parseResponseBody(res);
        throw new Error(buildErrorMessage(res, parsed));
      }

      const parsed = await parseResponseBody(res);
      if (!parsed.text) return {} as T;
      if (parsed.isJson) return (parsed.data ?? {}) as T;
      return parsed.text as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Request timed out");
      }

      if (attempt < retries) {
        maybeWarn(`Retrying ${path} after network error`, err);
        continue;
      }

      if (err instanceof Error) throw err;
      throw new Error("Network error");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Request failed");
}

export const api = {
  login(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        json: { email, password },
      }
    );
  },

  register(email: string, password: string) {
    return request<{ access_token: string; token_type: string }>(
      "/api/v1/auth/register",
      {
        method: "POST",
        json: { email, password },
      }
    );
  },

  getUpcoming(days: number = 7) {
    return request<ApiListResponse<Lesson>>(
      `/api/v1/dashboard/upcoming?days=${encodeURIComponent(days)}`,
      {
        method: "GET",
      }
    );
  },

  // ===== Students =====
  listStudents() {
    return request<ApiListResponse<Student>>("/api/v1/students", {
      method: "GET",
    });
  },

  createStudent(data: CreateStudentInput) {
    return request<Student>("/api/v1/students", {
      method: "POST",
      json: data,
    });
  },

  getStudent(studentId: string | number) {
    return request<Student>(`/api/v1/students/${studentId}`, {
      method: "GET",
    });
  },

  // ===== Lessons =====
  createLesson(data: CreateLessonInput) {
    return request<Lesson>("/api/v1/lessons", {
      method: "POST",
      json: data,
    });
  },

  requestLesson(lessonId: number) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`, {
      method: "GET",
    });
  },

  updateLesson(lessonId: number, data: LessonUpdate) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`, {
      method: "PUT",
      json: data,
    });
  },

  updatePayment(lessonId: number, data: PaymentUpdate) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}/payment`, {
      method: "PUT",
      json: data,
    });
  },

  updateHomework(lessonId: number, data: HomeworkUpdate) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}/homework`, {
      method: "PUT",
      json: data,
    });
  },
};
