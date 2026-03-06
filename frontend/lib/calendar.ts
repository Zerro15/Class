export const MINUTES_PER_DAY = 24 * 60;

export type CalendarViewMode = "day" | "3days" | "week" | "month";

export function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
}

export function toIsoLocal(date: Date) {
  return date.toISOString();
}

export function parseTimeToMinutes(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  return Math.max(0, Math.min(MINUTES_PER_DAY, hours * 60 + minutes));
}

export function getDayMinutes(dateIso: string) {
  const date = new Date(dateIso);
  return date.getHours() * 60 + date.getMinutes();
}

export function resolveVisibleRange(params: {
  workdayStart: number;
  workdayEnd: number;
  lessons: Array<{ start_at: string; duration_min: number }>;
}) {
  const safeStart = Math.min(params.workdayStart, params.workdayEnd - 60);
  const safeEnd = Math.max(params.workdayEnd, safeStart + 60);

  let minMinute = safeStart;
  let maxMinute = safeEnd;

  for (const lesson of params.lessons) {
    const lessonStart = getDayMinutes(lesson.start_at);
    const lessonEnd = lessonStart + lesson.duration_min;
    minMinute = Math.min(minMinute, lessonStart - 30);
    maxMinute = Math.max(maxMinute, lessonEnd + 30);
  }

  const normalizedMin = Math.max(0, Math.floor(minMinute / 30) * 30);
  const normalizedMax = Math.min(MINUTES_PER_DAY, Math.ceil(maxMinute / 30) * 30);

  return {
    startMinute: normalizedMin,
    endMinute: Math.max(normalizedMax, normalizedMin + 60),
  };
}

export function getTimeGridLabels(startMinute: number, endMinute: number, step = 60) {
  const labels: number[] = [];
  for (let minute = startMinute; minute <= endMinute; minute += step) {
    labels.push(minute);
  }
  return labels;
}

export function minuteToLabel(minute: number) {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getLessonPosition(startAt: string, durationMin: number, startMinute: number, endMinute: number) {
  const lessonMinutes = getDayMinutes(startAt);
  const visibleDuration = Math.max(endMinute - startMinute, 60);
  const topPercent = ((lessonMinutes - startMinute) / visibleDuration) * 100;
  const heightPercent = (durationMin / visibleDuration) * 100;
  return {
    topPercent: Math.max(-2, topPercent),
    heightPercent: Math.max(heightPercent, 4),
  };
}

export function formatRangeTitle(anchorDate: Date, mode: CalendarViewMode) {
  const fullFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  if (mode === "month") {
    return monthFormatter.format(anchorDate);
  }

  if (mode === "day") {
    return fullFormatter.format(anchorDate);
  }

  const rangeEnd = new Date(anchorDate);
  rangeEnd.setDate(anchorDate.getDate() + (mode === "3days" ? 2 : 6));
  const rangeFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
  return `${rangeFormatter.format(anchorDate)} — ${rangeFormatter.format(rangeEnd)}`;
}

export function formatDayHeader(day: Date, compact = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: compact ? "short" : "long",
    day: "numeric",
    month: compact ? undefined : "short",
  }).format(day);
}

export function getCalendarAnchor(date: Date, mode: CalendarViewMode) {
  if (mode === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  if (mode === "day") {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  const weekStart = getStartOfWeek(date);
  if (mode === "3days") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    if (start < weekStart) return weekStart;
    return start;
  }

  return weekStart;
}

export function shiftAnchor(anchor: Date, mode: CalendarViewMode, direction: -1 | 1) {
  const next = new Date(anchor);
  const delta = mode === "day" ? 1 : mode === "3days" ? 3 : mode === "week" ? 7 : 31;
  next.setDate(anchor.getDate() + direction * delta);
  return getCalendarAnchor(next, mode);
}

export function getVisibleDays(anchor: Date, mode: CalendarViewMode) {
  if (mode === "day") return [anchor];
  if (mode === "3days") {
    return Array.from({ length: 3 }).map((_, i) => {
      const day = new Date(anchor);
      day.setDate(anchor.getDate() + i);
      return day;
    });
  }
  if (mode === "week") return getWeekDays(anchor);
  return [];
}
