export type TutorBooking = {
  studentId: string;
  date: string;
  start: number;
  end: number;
};

export function findBookingConflict(
  bookings: readonly TutorBooking[],
  candidate: Pick<TutorBooking, "date" | "start" | "end">,
) {
  return bookings.find((booking) =>
    booking.date === candidate.date &&
    candidate.start < booking.end && candidate.end > booking.start,
  );
}

export function isTutorBooking(value: unknown): value is TutorBooking {
  if (typeof value !== "object" || value === null) return false;
  const booking = value as Partial<TutorBooking>;
  if (typeof booking.studentId !== "string" || booking.studentId.length === 0 ||
    typeof booking.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date) ||
    typeof booking.start !== "number" || typeof booking.end !== "number") return false;

  const day = new Date(`${booking.date}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === booking.date &&
    Number.isInteger(booking.start) && Number.isInteger(booking.end) &&
    booking.start >= 0 && booking.end <= 1440 && booking.start < booking.end;
}
