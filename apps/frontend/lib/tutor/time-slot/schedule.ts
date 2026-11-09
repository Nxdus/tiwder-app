export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function isValidTimeRange(start: number | null, end: number | null) {
  return start !== null && end !== null && end > start;
}

export type Period = "AM" | "PM";

export type TimeSelection = { time: number | null; period: Period | null };

export function toMinutes({ time, period }: TimeSelection) {
  return time === null || period === null ? null : time + (period === "PM" ? 720 : 0);
}

export function getBangkokDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export const timeOptions = Array.from({ length: 24 }, (_, index) => ({
  value: index * 30,
  label: formatTime(index * 30).split(" ")[0],
}));
