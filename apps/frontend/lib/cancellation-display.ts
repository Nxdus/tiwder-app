export function unscheduledCancellationLabel(status: string) {
  return status === "withdrawn" ? "Withdrawn before scheduling" : "Schedule not set";
}

export function formatCancellationTimestamp(timestamp?: string | null) {
  if (!timestamp) return null;
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(instant);
}
