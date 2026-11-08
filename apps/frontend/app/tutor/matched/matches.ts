import type { Student } from "../time-slot/students";

export type LessonStatus = "upcoming" | "in-progress" | "completed";

export type TutorMatch = {
  id: string;
  student: Student;
  tutorConfirmed: boolean;
  studentConfirmed: boolean;
  status: LessonStatus;
  startsAt: string;
  endsAt: string;
  price: number;
};

export function getConfirmedMatches(matches: TutorMatch[]) {
  return matches.filter((match) => match.tutorConfirmed && match.studentConfirmed);
}
