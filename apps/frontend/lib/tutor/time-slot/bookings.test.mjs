import assert from "node:assert/strict";
import { test } from "node:test";

import { findBookingConflict, isTutorBooking } from "./bookings.ts";

const booked = { studentId: "ST1", date: "2026-11-06", start: 720, end: 780 };

test("the tutor's reserved time blocks every student, including repeat bookings", () => {
  for (const studentId of ["ST1", "ST2", "ST3"]) {
    assert.equal(findBookingConflict([booked], { ...booked, studentId }), booked);
  }
});

test("partial overlaps, contained bookings, and enclosing bookings are blocked", () => {
  for (const [start, end] of [[690, 750], [750, 810], [735, 765], [660, 840]]) {
    assert.equal(findBookingConflict([booked], { date: booked.date, start, end }), booked);
  }
});

test("back-to-back bookings and the same time on another date are available", () => {
  for (const candidate of [
    { date: booked.date, start: 660, end: 720 },
    { date: booked.date, start: 780, end: 840 },
    { date: "2026-11-07", start: 720, end: 780 },
  ]) {
    assert.equal(findBookingConflict([booked], candidate), undefined);
  }
});

test("all reservations are checked even when their students differ", () => {
  const later = { studentId: "ST2", date: booked.date, start: 840, end: 900 };
  assert.equal(findBookingConflict([booked, later], { date: booked.date, start: 810, end: 870 }), later);
  assert.equal(findBookingConflict([], booked), undefined);
});

test("saved reservations require real dates and a valid same-day time range", () => {
  assert.equal(isTutorBooking(booked), true);
  for (const patch of [
    { date: "2026-02-30" }, { date: "not-a-date" }, { studentId: "" },
    { start: -1 }, { start: 720.5 }, { end: 720 }, { end: 1441 }, { end: "780" },
  ]) {
    assert.equal(isTutorBooking({ ...booked, ...patch }), false);
  }
  assert.equal(isTutorBooking(null), false);
});
