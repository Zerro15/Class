export type LessonStatus = "scheduled" | "done" | "canceled";

export interface Student {
  id: number;
  name: string;
  notes?: string | null;
}

export interface Lesson {
  id: number;
  student_id: number;
  start_at: string;
  duration_min: number;
  status: LessonStatus;
  topic?: string | null;
  price: number;
}

export type LessonUpdate = {
  status?: LessonStatus;
  topic?: string | null;
  start_at?: string;
  duration_min?: number;
  price?: number;
};

export type PaymentUpdate = {
  is_paid?: boolean;
  paid_amount?: number;
  paid_at?: string | null;
};

export type HomeworkUpdate = {
  text?: string | null;
  link?: string | null;
  is_sent?: boolean;
  sent_at?: string | null;
};

export type CreateStudentInput = {
  name: string;
  notes?: string | null;
};

export type CreateLessonInput = {
  student_id: number;
  start_at: string;
  duration_min: number;
  price: number;
  topic?: string | null;
};

export type ApiListResponse<T> = {
  items: T[];
};
