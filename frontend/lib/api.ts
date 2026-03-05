const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_KEY = "classflow_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

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

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");

  const token = tokenStorage.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }

    if (res.status === 401 && path !== "/api/v1/auth/login" && path !== "/api/v1/auth/register") {
      tokenStorage.clear();
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

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
    return request<{ items: unknown[] }>(`/api/v1/dashboard/upcoming?days=${days}`);
  },
  requestLesson(id: number) {
    return request<{
      id: number;
      start_at: string;
      duration_min: number;
      status: string;
      topic?: string | null;
      price: number;
    }>(`/api/v1/lessons/${id}`);
  },
  updateLesson(id: number, payload: { status: string }) {
    return request<{ id: number }>(`/api/v1/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updatePayment(id: number, payload: { is_paid: boolean; paid_amount: number; paid_at: string }) {
    return request<{ ok: boolean }>(`/api/v1/lessons/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updateHomework(id: number, payload: { text: string | null; link: string | null; is_sent: boolean; sent_at: string }) {
    return request<{ ok: boolean }>(`/api/v1/lessons/${id}/homework`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
