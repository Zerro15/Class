export const MINUTES_PER_DAY = 24 * 60;

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

export function getLessonPosition(startAt: string, durationMin: number) {
  const date = new Date(startAt);
  const minutes = date.getHours() * 60 + date.getMinutes();
  // Комментарий наставника: позиционируем карточки в процентах от суток — так сетка остаётся отзывчивой без тяжёлых библиотек.
  const topPercent = (minutes / MINUTES_PER_DAY) * 100;
  const heightPercent = (durationMin / MINUTES_PER_DAY) * 100;
  return { topPercent, heightPercent: Math.max(heightPercent, 2) };
}

export function formatRangeTitle(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  return `${formatter.format(weekStart)} — ${formatter.format(weekEnd)}`;
}

export function formatDayHeader(day: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric" }).format(day);
}
