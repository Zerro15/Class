import { ApiError, request, toQueryString } from "@/lib/api-client";
import { clearToken, getToken, isAuthRoute, setToken, subscribeToSessionChange } from "@/lib/api-session";
import {
  normalizeLessonSeries,
  toSeriesApiPayload,
  type FinanceFilters,
  type LessonItem,
  type LessonPayload,
  type LessonSeriesItem,
  type LessonSeriesWritePayload,
  type RawLessonSeriesItem,
  type UserSettings,
} from "@/lib/api-types";

export { ApiError, clearToken, getToken, isAuthRoute, setToken, subscribeToSessionChange };
export type { FinanceFilters, LessonItem, LessonSeriesItem, UserSettings };

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
  updateStudent(id: string, payload: { name?: string; notes?: string | null }) {
    return request<{ id: number; name: string; notes: string | null }>(`/api/v1/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteStudent(id: string) {
    return request<void>(`/api/v1/students/${id}`, {
      method: "DELETE",
    });
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
  listLessons(filters: { from?: string; to?: string; student_id?: number; status?: LessonItem["status"] }) {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.student_id !== undefined) params.set("student_id", String(filters.student_id));
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return request<LessonItem[]>(`/api/v1/lessons${qs ? `?${qs}` : ""}`);
  },
  requestLesson(id: number) {
    return request<LessonItem>(`/api/v1/lessons/${id}`);
  },
  updateLesson(id: number, payload: { status?: string; is_archived?: boolean; start_at?: string; duration_min?: number; topic?: string | null; price?: number; student_id?: number; apply_to_future?: boolean }) {
    return request<LessonItem>(`/api/v1/lessons/${id}`, {
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
    return request<RawLessonSeriesItem[]>("/api/v1/lesson-series").then((items) => items.map(normalizeLessonSeries));
  },
  createLessonSeries(payload: LessonSeriesWritePayload) {
    return request<RawLessonSeriesItem>("/api/v1/lesson-series", {
      method: "POST",
      body: JSON.stringify(toSeriesApiPayload(payload)),
    }).then(normalizeLessonSeries);
  },
  updateLessonSeries(id: number, payload: Partial<LessonSeriesWritePayload> & { apply_to_future?: boolean }) {
    return request<RawLessonSeriesItem>(`/api/v1/lesson-series/${id}`, {
      method: "PATCH",
      body: JSON.stringify(toSeriesApiPayload(payload)),
    }).then(normalizeLessonSeries);
  },
  applySeriesPatch(
    id: number,
    payload: { from_start_at: string; patch: { duration_min?: number; topic?: string | null; price?: number }; also_update_series_template?: boolean },
  ) {
    return request<{ updated_lessons: number; series_updated: boolean }>(`/api/v1/lesson-series/${id}/apply`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async applySchedule(payload: { week_start: string; days: number; strategy: "skip_existing" }) {
    const seriesItems = await api.listLessonSeries();
    const activeSeries = seriesItems.filter((item) => item.is_active);
    const results = await Promise.all(activeSeries.map((item) => api.applySeriesSchedule(item.id, payload.week_start)));
    return {
      created: results.reduce((sum, item) => sum + item.created, 0),
      skipped: results.reduce((sum, item) => sum + item.skipped, 0),
    };
  },
  applySeriesSchedule(id: number, weekStart?: string) {
    return request<{ created: number; skipped: number }>(`/api/v1/lesson-series/${id}/apply-schedule`, {
      method: "POST",
      ...(weekStart ? { body: JSON.stringify({ week_start: weekStart, days: 7, strategy: "skip_existing" }) } : {}),
    });
  },
  deleteLessonSeries(id: number, futureAction: "detach" | "cancel" = "detach") {
    return request<void>(`/api/v1/lesson-series/${id}?future_action=${futureAction}`, {
      method: "DELETE",
    });
  },
};

// Уведомления
export const notifications = {
  list() {
    return request<Notification[]>("/api/v1/notifications");
  },

  create(payload: CreateNotificationRequest) {
    return request<Notification>("/api/v1/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: number, payload: UpdateNotificationRequest) {
    return request<Notification>(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  scheduleReminder(lessonId: number, payload: ScheduleReminderRequest = {}) {
    const params = new URLSearchParams();
    if (payload.reminder_type) params.set("reminder_type", payload.reminder_type);
    if (payload.delay_hours) params.set("delay_hours", String(payload.delay_hours));

    return request<{ status: string; lesson_id: number; delay_hours: number }>(
      `/api/v1/notifications/${lessonId}/schedule-reminder${params.toString() ? `?${params.toString()}` : ""}`,
      { method: "POST" }
    );
  },
};
