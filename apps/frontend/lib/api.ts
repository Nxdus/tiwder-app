export type Role = "student" | "tutor";
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";
export type User = {
  id: string;
  role: Role | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  onboarded: boolean;
};
export type Session = { user: User | null; csrfToken?: string };
export type Subject = {
  id: string;
  name: string;
  categories: { id: string; name: string }[];
};
export type Teaching = {
  subjectId: string;
  skillLevel: SkillLevel;
  subject: Subject;
};
export type PublicTutor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  education: string;
  experienceYears: number;
  hourlyRate: number;
  teachings: Teaching[];
};
export type Profile = User & {
  phone?: string;
  bio?: string;
  gradeLevel?: string;
  education?: string;
  experienceYears?: number;
  hourlyRate?: number;
  teachings?: Teaching[];
};
export type Proposal = { date: string; start: number; end: number };
export type StudentPreview = {
  id: string;
  name: string;
  avatarUrl: string | null;
  gradeLevel: string;
  bio: string;
};
export type TutorPreview = {
  id: string;
  name: string;
  avatarUrl: string | null;
  education: string;
  experienceYears: number;
  bio: string;
};
export type Interest = {
  student: StudentPreview;
  tutor: TutorPreview;
  id: string;
  status: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  subjectId: string;
  subjectName: string;
  skillLevel: SkillLevel;
  hourlyRate: number;
  proposal: Proposal | null;
};
export type Match = Proposal & {
  student: StudentPreview;
  tutor: TutorPreview;
  id: string;
  status: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  subjectId: string;
  subjectName: string;
  skillLevel: SkillLevel;
  hourlyRate: number;
  contact: { email: string; phone: string } | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  csrfToken?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(". ")
          : "Unable to complete this request. Please try again.",
      response.status,
    );
  return body as T;
}

export const roleHome = (role: Role | null) =>
  role === "tutor" ? "/tutor/swiped" : "/";
export const formatMinutes = (minutes: number) =>
  minutes === 1440
    ? "24:00"
    : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
