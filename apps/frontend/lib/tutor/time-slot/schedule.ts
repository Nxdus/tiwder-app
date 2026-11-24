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

export function getScheduleFeedback(
  date: string | null,
  startSelection: TimeSelection,
  endSelection: TimeSelection,
  now: Date,
) {
  if (!date) return "Select a lesson date.";
  if (date < getBangkokDate(now)) return "Choose today or a future date.";

  const start = toMinutes(startSelection);
  const end = toMinutes(endSelection);
  if (start === null && end === null) return "Select both times and AM/PM.";
  if (start === null) return startSelection.time === null
    ? "Select a start time."
    : "Select AM/PM for the start time.";
  if (end === null) return endSelection.time === null
    ? "Select an end time."
    : "Select AM/PM for the end time.";
  if (start === end) return "Times are equal. Set a later end.";
  if (!isValidTimeRange(start, end)) return "End time must be after start time.";
  if (Date.parse(`${date}T00:00:00+07:00`) + start * 60_000 <= now.getTime()) {
    return "Choose a future start time (Bangkok).";
  }
  return null;
}

const scheduleRequestErrors: Record<string, string> = {
  "Choose a different time from the previous offer.": "Same time as before. Choose another.",
  "Start must be in the future": "Choose a future start time (Bangkok).",
  "Start must precede end": "End time must be after start time.",
  "Interest already closed": "Request closed. Return to Swiped.",
  "Proposal already sent": "Proposal sent. Check Swiped.",
  "Proposal expired": "Proposal expired. Check Swiped.",
  "This account has been deleted": "Student deleted their account.",
  "Interest cannot be rejected in this state": "Request changed. Check Swiped.",
  "This lesson overlaps another confirmed lesson for the student or tutor": "Time already booked. Choose another.",
};

export function getScheduleRequestError(status?: number, message?: string) {
  if (status === undefined) return "Connection failed. Please retry.";
  if (status === 401) return "Session expired. Sign in again.";
  if (status === 403) return "Access denied. Refresh and retry.";
  if (status >= 500) return "Server error. Please try again.";
  const knownMessage = scheduleRequestErrors[message ?? ""];
  if (knownMessage) return knownMessage;
  if (status === 404) return "Request unavailable. Return to Swiped.";
  if (status === 409) return "Request updated. Check Swiped.";
  if (status === 429) return "Too many attempts. Try again shortly.";
  if (status === 400) return "Check the selected date and times.";
  return "Request failed. Please try again.";
}

export const timeOptions = Array.from({ length: 24 }, (_, index) => ({
  value: index * 30,
  label: formatTime(index * 30).split(" ")[0],
}));
