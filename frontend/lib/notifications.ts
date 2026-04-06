export interface Notification {
  id: number;
  type: "reminder" | "homework_due" | "cancellation";
  message: string;
  sent_via: "email" | "sms" | "push";
  sent_at?: string | null;
  is_read: boolean;
  created_at: string;
  lesson_id?: number | null;
  student_id: number;
}

export interface CreateNotificationRequest {
  student_id: number;
  lesson_id?: number;
  type: "reminder" | "homework_due" | "cancellation";
  message: string;
  sent_via: "email" | "sms" | "push";
}

export interface ScheduleReminderRequest {
  reminder_type?: "email" | "sms" | "push";
  delay_hours?: number;
}

export interface UpdateNotificationRequest {
  is_read?: boolean;
}
