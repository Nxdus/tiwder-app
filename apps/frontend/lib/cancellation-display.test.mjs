import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCancellationTimestamp, unscheduledCancellationLabel } from "./cancellation-display.ts";

test("withdrawn requests without a proposed time explain that scheduling never happened", () => {
  assert.equal(unscheduledCancellationLabel("withdrawn"), "Withdrawn before scheduling");
  for (const status of ["pending", "rejected", "cancelled"]) {
    assert.equal(unscheduledCancellationLabel(status), "Schedule not set");
  }
});

test("cancellation timestamps use the Bangkok date and time, including rollover past midnight", () => {
  assert.equal(formatCancellationTimestamp("2026-11-24T17:30:00Z"), "25 Nov 2026, 00:30");
  assert.equal(formatCancellationTimestamp("2026-11-24T08:38:58Z"), "24 Nov 2026, 15:38");
});

test("missing or invalid cancellation timestamps are not replaced with an invented date", () => {
  for (const value of [null, undefined, "", "invalid-date"]) {
    assert.equal(formatCancellationTimestamp(value), null);
  }
});
