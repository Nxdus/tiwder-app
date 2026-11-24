import assert from "node:assert/strict";
import { test } from "node:test";
import { isVisibleRequest } from "./booking-visibility.ts";

const proposal = { date: "2099-01-01", start: 600, end: 660 };

test("a tutor declining a request leaves a cancelled card only for the student", () => {
  const request = { status: "rejected", proposal: null };
  assert.equal(isVisibleRequest(request, "tutor"), false);
  assert.equal(isVisibleRequest(request, "student"), true);
});

test("a student withdrawing a request leaves a cancelled card only for the tutor", () => {
  const request = { status: "withdrawn", proposal: null };
  assert.equal(isVisibleRequest(request, "student"), false);
  assert.equal(isVisibleRequest(request, "tutor"), true);
});

test("a student declining a proposed time leaves a cancelled card only for the tutor", () => {
  const request = { status: "rejected", proposal };
  assert.equal(isVisibleRequest(request, "student"), false);
  assert.equal(isVisibleRequest(request, "tutor"), true);
});

test("active requests remain visible to both roles while matched and expired requests stay out", () => {
  for (const role of ["student", "tutor"]) {
    assert.equal(isVisibleRequest({ status: "pending", proposal: null }, role), true);
    assert.equal(isVisibleRequest({ status: "proposed", proposal }, role), true);
    for (const status of ["confirmed", "completed", "cancelled", "expired", "closed"]) {
      assert.equal(isVisibleRequest({ status, proposal }, role), false);
    }
  }
});
