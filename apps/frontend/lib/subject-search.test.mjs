import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesSubjectName } from "./subject-search.ts";

const subjects = ["Python Programming", "Academic Writing", "Web Development"];
const search = (query) => subjects.filter((name) => matchesSubjectName(name, query));

test("matches the start of any word, regardless of case", () => {
  assert.deepEqual(search("p"), ["Python Programming"]);
  assert.deepEqual(search("w"), ["Academic Writing", "Web Development"]);
  assert.deepEqual(search("WR"), ["Academic Writing"]);
  assert.deepEqual(search("py"), ["Python Programming"]);
  assert.deepEqual(search("pro"), ["Python Programming"]);
  assert.deepEqual(search("d"), ["Web Development"]);
});

test("does not match inside words", () => {
  for (const query of ["y", "ython", "riting", "unknown"]) {
    assert.deepEqual(search(query), []);
  }
});

test("shows the whole catalog before typing or after clearing the search", () => {
  assert.deepEqual(search(""), subjects);
  assert.deepEqual(search("   "), subjects);
});

test("supports phrases and extra whitespace", () => {
  assert.deepEqual(search("  PYTHON   PRO  "), ["Python Programming"]);
  assert.equal(matchesSubjectName("Academic\t Writing", "w"), true);
});
