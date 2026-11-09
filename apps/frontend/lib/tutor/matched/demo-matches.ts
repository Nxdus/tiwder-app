import { students } from "@/lib/tutor/students";
import type { LessonStatus, TutorMatch } from "@/lib/tutor/matched/matches";
import type { TutorBooking } from "@/lib/tutor/time-slot/bookings";

const lessons: { status: LessonStatus; date: string }[] = [
  { status: "upcoming", date: "2026-11-07" },
  { status: "in-progress", date: "2026-11-05" },
  { status: "completed", date: "2026-11-04" },
];

// shortcut: illustrative confirmations and lesson states, replace with authenticated API data when matching is available.
export const demoMatches: TutorMatch[] = students.map((student, index) => {
  const lesson = lessons[index % lessons.length];
  const startHour = 16 + Math.floor(index / lessons.length);

  return {
    id: `demo-match-${index + 1}`,
    student,
    tutorConfirmed: true,
    studentConfirmed: true,
    status: lesson.status,
    startsAt: `${lesson.date}T${startHour}:30:00+07:00`,
    endsAt: `${lesson.date}T${startHour + 1}:30:00+07:00`,
    price: 250,
  };
});

// These fixtures are Bangkok-local timestamps (+07:00), just like the picker.
export const demoBookings: TutorBooking[] = demoMatches.map((match) => ({
  studentId: match.student.id,
  date: match.startsAt.slice(0, 10),
  start: Number(match.startsAt.slice(11, 13)) * 60 + Number(match.startsAt.slice(14, 16)),
  end: Number(match.endsAt.slice(11, 13)) * 60 + Number(match.endsAt.slice(14, 16)),
}));
