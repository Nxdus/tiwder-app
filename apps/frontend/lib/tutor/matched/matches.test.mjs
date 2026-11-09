import assert from "node:assert/strict";
import { test } from "node:test";

import { getConfirmedMatches } from "./matches.ts";

test("a tutor-confirmed slot stays hidden until the student confirms the match", () => {
  const pending = { id: "pending", tutorConfirmed: true, studentConfirmed: false, status: "upcoming" };
  assert.deepEqual(getConfirmedMatches([pending]), []);
  assert.equal(getConfirmedMatches([{ ...pending, studentConfirmed: true }]).length, 1);
});

test("both confirmations are required for every lesson status", () => {
  for (const status of ["upcoming", "in-progress", "completed"]) {
    const matches = [false, true].flatMap((tutorConfirmed) =>
      [false, true].map((studentConfirmed) => ({
        id: `${tutorConfirmed}-${studentConfirmed}`, tutorConfirmed, studentConfirmed, status,
      })),
    );
    assert.deepEqual(getConfirmedMatches(matches), [matches[3]]);
  }
  assert.deepEqual(getConfirmedMatches([]), []);
});
