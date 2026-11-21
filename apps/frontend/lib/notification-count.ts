import type { Interest, Role } from "./api";

export function notificationCount(
  interests: Pick<Interest, "status" | "studentId">[],
  role: Role,
) {
  if (role === "student")
    return interests.filter((item) => item.status === "proposed").length;
  return new Set(
    interests.filter((item) => item.status === "pending").map((item) => item.studentId),
  ).size;
}
