import assert from "node:assert/strict";
import { test } from "node:test";

import { formatTime, getBangkokDate, getScheduleFeedback, getScheduleRequestError, isValidTimeRange, timeOptions, toMinutes } from "./schedule.ts";

test("half-hour choices distinguish midnight, noon, and evening", () => {
  assert.equal(timeOptions.length, 24);
  assert.equal(formatTime(0), "12:00 AM");
  assert.equal(formatTime(720), "12:00 PM");
  assert.equal(formatTime(990), "4:30 PM");
  assert.equal(timeOptions[0]?.label, "12:00");
  assert.equal(timeOptions.at(-1)?.label, "11:30");
});

test("separate AM/PM selections handle noon, midnight, and incomplete values", () => {
  assert.equal(toMinutes({ time: 0, period: "AM" }), 0);
  assert.equal(toMinutes({ time: 0, period: "PM" }), 720);
  assert.equal(toMinutes({ time: 30, period: "PM" }), 750);
  assert.equal(toMinutes({ time: 270, period: "PM" }), 990);
  assert.equal(toMinutes({ time: null, period: "AM" }), null);
  assert.equal(toMinutes({ time: 270, period: null }), null);
  assert.equal(isValidTimeRange(toMinutes({ time: 690, period: "AM" }), toMinutes({ time: 0, period: "PM" })), true);
  assert.equal(isValidTimeRange(toMinutes({ time: 690, period: "PM" }), toMinutes({ time: 0, period: "AM" })), false);
});

test("the default date follows Bangkok midnight and leap days", () => {
  assert.equal(getBangkokDate(new Date("2026-11-04T16:59:59Z")), "2026-11-04");
  assert.equal(getBangkokDate(new Date("2026-11-04T17:00:00Z")), "2026-11-05");
  assert.equal(getBangkokDate(new Date("2028-02-28T17:00:00Z")), "2028-02-29");
});

test("a same-day lesson requires both times and an end after the start", () => {
  assert.equal(isValidTimeRange(null, 750), false);
  assert.equal(isValidTimeRange(630, null), false);
  assert.equal(isValidTimeRange(630, 630), false);
  assert.equal(isValidTimeRange(630, 600), false);
  assert.equal(isValidTimeRange(630, 750), true);
});

const now = new Date("2026-11-21T04:00:00Z"); // 11:00 AM in Bangkok.
const noon = { time: 0, period: "PM" };
const halfPastNoon = { time: 30, period: "PM" };

test("scheduling feedback identifies missing dates, times, and AM/PM selections", () => {
  const missing = { time: null, period: null };
  assert.equal(getScheduleFeedback(null, noon, halfPastNoon, now), "Select a lesson date.");
  assert.equal(getScheduleFeedback("2026-11-21", missing, missing, now), "Select both times and AM/PM.");
  assert.equal(getScheduleFeedback("2026-11-21", missing, halfPastNoon, now), "Select a start time.");
  assert.equal(getScheduleFeedback("2026-11-21", noon, missing, now), "Select an end time.");
  assert.equal(getScheduleFeedback("2026-11-21", { time: 0, period: null }, halfPastNoon, now), "Select AM/PM for the start time.");
  assert.equal(getScheduleFeedback("2026-11-21", noon, { time: 30, period: null }, now), "Select AM/PM for the end time.");
});

test("scheduling feedback distinguishes equal times from reversed and overnight ranges", () => {
  assert.equal(getScheduleFeedback("2026-11-21", noon, noon, now), "Times are equal. Set a later end.");
  for (const [start, end] of [[halfPastNoon, noon], [{ time: 690, period: "PM" }, { time: 0, period: "AM" }]]) {
    assert.equal(getScheduleFeedback("2026-11-21", start, end, now), "End time must be after start time.");
  }
});

test("scheduling feedback validates future start times against the Bangkok clock", () => {
  assert.equal(getScheduleFeedback("2026-11-20", noon, halfPastNoon, now), "Choose today or a future date.");
  const start = { time: 660, period: "AM" };
  assert.equal(getScheduleFeedback("2026-11-21", start, noon, now), "Choose a future start time (Bangkok).");
  assert.equal(getScheduleFeedback("2026-11-21", noon, halfPastNoon, now), null);
  assert.equal(getScheduleFeedback("2026-11-21", noon, halfPastNoon, new Date("2026-11-21T05:00:00Z")), "Choose a future start time (Bangkok).");
  const bangkokMidnight = new Date("2026-11-21T17:00:00Z");
  assert.equal(getScheduleFeedback("2026-11-21", noon, halfPastNoon, bangkokMidnight), "Choose today or a future date.");
  assert.equal(getScheduleFeedback("2026-11-22", noon, halfPastNoon, bangkokMidnight), null);
});

test("request failures provide guidance for network, session, and server errors", () => {
  for (const [status, expected] of [
    [undefined, "Connection failed. Please retry."],
    [401, "Session expired. Sign in again."],
    [403, "Access denied. Refresh and retry."],
    [404, "Request unavailable. Return to Swiped."],
    [409, "Request updated. Check Swiped."],
    [429, "Too many attempts. Try again shortly."],
    [500, "Server error. Please try again."],
    [400, "Check the selected date and times."],
    [418, "Request failed. Please try again."],
  ]) {
    assert.equal(getScheduleRequestError(status), expected);
  }
  assert.equal(getScheduleRequestError(409, "Proposal already sent"), "Proposal sent. Check Swiped.");
  assert.equal(getScheduleRequestError(409, "This lesson overlaps another confirmed lesson for the student or tutor"), "Time already booked. Choose another.");
});
