import assert from "node:assert/strict";
import { test } from "node:test";
import { notificationCount } from "./notification-count.ts";

test("students only see offers awaiting their response", () => {
  const items = ["pending", "proposed", "proposed", "confirmed", "rejected", "withdrawn", "closed", "expired"]
    .map((status) => ({ status, studentId: "student" }));
  assert.equal(notificationCount(items, "student"), 2);
  assert.equal(notificationCount([{ status: "pending", studentId: "student" }], "student"), 0);
  assert.equal(notificationCount([], "student"), 0);
});

test("tutors count distinct students still awaiting a proposal", () => {
  const items = [
    { status: "pending", studentId: "one" },
    { status: "pending", studentId: "one" },
    { status: "pending", studentId: "two" },
    ...["proposed", "confirmed", "rejected", "withdrawn", "closed", "expired"]
      .map((status) => ({ status, studentId: "other" })),
  ];
  assert.equal(notificationCount(items, "tutor"), 2);
  assert.equal(notificationCount(items.map((item) => ({ ...item, status: "proposed" })), "tutor"), 0);
  assert.equal(notificationCount([], "tutor"), 0);
});
