import assert from "node:assert/strict";
import { test } from "node:test";

import { formatTime, getBangkokDate, isValidTimeRange, timeOptions, toMinutes } from "./schedule.ts";

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
