export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ApiError = {
  detail: string;
};

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("classflow_token");
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("classflow_token", token);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("classflow_token");
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ detail: "Ошибка" }))) as ApiError;
    throw new Error(errorBody.detail || "Ошибка запроса");
  }

  return response.json() as Promise<T>;
}

export const api = {
  async register(email: string, password: string) {
    return request<{ access_token: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  async login(email: string, password: string) {
    return request<{ access_token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  async listStudents() {
    return request<Array<{ id: number; name: string; notes: string | null }>>(
      "/api/v1/students"
    );
  },
  async getStudent(id: string) {
    return request<{ id: number; name: string; notes: string | null }>(
      `/api/v1/students/${id}`
    );
  },
  async createStudent(payload: { name: string; notes: string | null }) {
    return request<{ id: number }>("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateStudent(id: number, payload: { name?: string; notes?: string | null }) {
    return request(`/api/v1/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  async listLessons(params: { from?: string; to?: string }) {
    const query = new URLSearchParams(params).toString();
    return request<Array<any>>(`/api/v1/lessons?${query}`);
  },
  async requestLesson(id: number) {
    return request(`/api/v1/lessons/${id}`);
  },
  async createLesson(payload: any) {
    return request<{ id: number }>("/api/v1/lessons", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async updateLesson(id: number, payload: any) {
    return request(`/api/v1/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  async getUpcoming(days = 7) {
    return request<{ items: any[] }>(`/api/v1/dashboard/upcoming?days=${days}`);
  },
  async updatePayment(lessonId: number, payload: any) {
    return request(`/api/v1/lessons/${lessonId}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  async updateHomework(lessonId: number, payload: any) {
    return request(`/api/v1/lessons/${lessonId}/homework`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
