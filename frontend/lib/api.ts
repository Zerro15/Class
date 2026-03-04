const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_KEY = "classflow_token";

export interface User {
  id: number;
  email: string;
}

export type LessonStatus = "scheduled" | "done" | "canceled";
export type HomeworkStatus = "todo" | "done";
export type PaymentStatus = "unpaid" | "paid";

export interface Homework {
  id: number;
  lesson_id: number;
  text: string | null;
  status: HomeworkStatus;
  updated_at: string | null;
}

export interface Payment {
  id: number;
  lesson_id: number;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
}

export interface Lesson {
  id: number;
  student_id: number;
  start_at: string;
  duration_min: number;
  status: LessonStatus;
  topic: string | null;
  notes: string | null;
  price: number;
  tax_percent: number;
  homework: Homework | null;
  payment: Payment | null;
}

export interface Student {
  id: number;
  name: string;
  notes: string | null;
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
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
    if (res.status === 401 || res.status === 403) {
      tokenStorage.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new UnauthorizedError();
    }
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
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
  listStudentLessons(studentId: string | number) {
    return request<Lesson[]>(`/api/v1/students/${studentId}/lessons`);
  },
  createStudentLesson(
    studentId: string | number,
    payload: {
      starts_at: string;
      topic: string;
      notes: string | null;
      duration_min: number;
      homework_text?: string;
      payment_amount?: number;
    },
  ) {
    return request<Lesson>(`/api/v1/students/${studentId}/lessons`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  requestLesson(lessonId: number) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`);
  },
  updateLesson(
    lessonId: number,
    payload: Partial<{
      starts_at: string;
      start_at: string;
      duration_min: number;
      status: LessonStatus;
      topic: string | null;
      notes: string | null;
      price: number;
    }>,
  ) {
    return request<Lesson>(`/api/v1/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteLesson(lessonId: number) {
    return request<void>(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
  },
  markHomeworkDone(lessonId: number) {
    return request<Homework>(`/api/v1/lessons/${lessonId}/homework/done`, { method: "POST" });
  },
  markPaymentPaid(lessonId: number) {
    return request<Payment>(`/api/v1/lessons/${lessonId}/payment/paid`, { method: "POST" });
  },
  getUpcoming(days = 7) {
    return request<{ items: Lesson[] }>(`/api/v1/dashboard/upcoming?days=${days}`);
  },
};
