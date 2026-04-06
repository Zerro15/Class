export interface LessonPayload {
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
  owner_id?: number;
  student_id: number;
  weekday: number;
  start_time: string;
  time_of_day: string;
  duration_min: number;
  topic: string | null;
  price: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RawLessonSeriesItem = Omit<LessonSeriesItem, "start_time" | "time_of_day" | "is_active"> & {
  start_time?: string;
  time_of_day?: string;
  is_active?: boolean;
};

export type LessonSeriesWritePayload = {
  student_id: number;
  weekday: number;
  duration_min: number;
  topic: string | null;
  price: number;
  is_active?: boolean;
  start_time?: string;
  time_of_day?: string;
};

export interface FinanceFilters {
  from?: string;
  to?: string;
  student_id?: number;
  paid?: boolean;
  transferred?: boolean;
  archived?: boolean;
}

export function normalizeLessonSeries(item: RawLessonSeriesItem): LessonSeriesItem {
  const normalizedTime = item.time_of_day ?? item.start_time ?? "00:00:00";
  return {
    ...item,
    start_time: normalizedTime,
    time_of_day: normalizedTime,
    is_active: item.is_active ?? true,
  };
}

export function toSeriesApiPayload(payload: Partial<LessonSeriesWritePayload>) {
  const normalizedTime = payload.time_of_day ?? payload.start_time;
  return {
    ...payload,
    time_of_day: normalizedTime,
    start_time: normalizedTime,
  };
}
