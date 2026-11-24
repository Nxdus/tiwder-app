import type { Interest, Role } from "./api";

export function isVisibleRequest(
  request: Pick<Interest, "status" | "proposal">,
  role: Role | null | undefined,
) {
  if (request.status === "pending" || request.status === "proposed") return true;
  if (request.status === "withdrawn") return role === "tutor";
  if (request.status === "rejected") {
    // Tutors can decline only pending requests (no proposal); students can
    // decline only proposed times. Keep the cancelled card for the recipient.
    return request.proposal ? role === "tutor" : role === "student";
  }
  return false;
}
