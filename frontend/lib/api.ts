const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_KEY = "classflow_token";

export interface User {
  id: number;
  email: string;
}

export interface Lesson {
  id: number;
  student_id: number;
  start_at: string;
  duration_min: number;
  status: "scheduled" | "done" | "canceled";
  topic: string | null;
  price: number;
  tax_percent: number;
}

export interface Student {
  id: number;
  name: string;
  notes: string | null;
}

export interface Payment {
  id: number;
  lesson_id: number;
  is_paid: boolean;
  paid_amount: number;
  paid_at: string | null;
}

export interface Homework {
  id: number;
  lesson_id: number;
  text: string | null;
  link: string | null;
  is_sent: boolean;
  sent_at: string | null;
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
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
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
    return request<User>("/api/v1/auth/me");
  },
  getUpcoming(days = 7) {
    return request<{ items: Lesson[] }>(`/api/v1/dashboard/upcoming?days=${days}`);
  },
  listStudents() {
    return request<Student[]>("/api/v1/students");
  },
  getStudent(studentId: string | number) {
    return request<Student>(`/api/v1/students/${studentId}`);
  },
  createStudent(payload: { name: string; notes: string | null }) {
    return request<Student>("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createLesson(payload: {
    student_id: number;
    start_at: string;
    duration_min: number;
    status: "scheduled" | "done" | "canceled";
    topic: string;
    price: number;
  }) {
    return request<Lesson>("/api/v1/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  requestLesson(lessonId: number) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`);
  },
  updateLesson(
    lessonId: number,
    payload: Partial<Pick<Lesson, "start_at" | "duration_min" | "status" | "topic" | "price">>,
  ) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updatePayment(
    lessonId: number,
    payload: { is_paid: boolean; paid_amount: number; paid_at: string | null },
  ) {
    return request<Payment>(`/api/v1/lessons/${lessonId}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  updateHomework(
    lessonId: number,
    payload: { text: string | null; link: string | null; is_sent: boolean; sent_at: string | null },
  ) {
    return request<Homework>(`/api/v1/lessons/${lessonId}/homework`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
