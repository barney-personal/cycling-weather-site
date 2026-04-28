// Stale-data banner gate — pure-function tests for `isStale`. The threshold
// (36h) is the contract; below it the banner stays silent, above it the
// banner appears with a human-relative timestamp. Run via
// `node --test --experimental-strip-types`.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isStale } from "../src/components/stale-banner.ts";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-04-28T12:00:00Z");

test("isStale — fresh (under 36h) returns false", () => {
  const generated = new Date(NOW - 12 * HOUR).toISOString();
  assert.equal(isStale(generated, NOW), false);
});

test("isStale — exactly at 36h boundary returns false (strict greater-than)", () => {
  const generated = new Date(NOW - 36 * HOUR).toISOString();
  assert.equal(isStale(generated, NOW), false);
});

test("isStale — just over 36h returns true", () => {
  const generated = new Date(NOW - 36 * HOUR - 1).toISOString();
  assert.equal(isStale(generated, NOW), true);
});

test("isStale — well past 36h (e.g. 5 days) returns true", () => {
  const generated = new Date(NOW - 5 * 24 * HOUR).toISOString();
  assert.equal(isStale(generated, NOW), true);
});

test("isStale — empty/garbage timestamp returns false (don't false-alarm on a parse error)", () => {
  assert.equal(isStale("", NOW), false);
  assert.equal(isStale("not-a-date", NOW), false);
});
