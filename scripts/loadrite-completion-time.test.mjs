import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCompletionLabel } from "./loadrite-completion-time.mjs";

const syncTime = new Date(2026, 9, 21, 0, 5, 0);

test("uses the sync date for a valid time-only completion label", () => {
  assert.equal(normalizeCompletionLabel("11:47 PM", syncTime), "10/21/2026, 11:47 PM");
});

test("handles midnight without turning it into noon", () => {
  assert.equal(normalizeCompletionLabel("12:05 AM", syncTime), "10/21/2026, 12:05 AM");
});

test("rejects date-only labels instead of inventing a noon time", () => {
  assert.equal(normalizeCompletionLabel("20 Oct 26", syncTime), null);
});

test("rejects empty and unparseable completion labels", () => {
  assert.equal(normalizeCompletionLabel("", syncTime), null);
  assert.equal(normalizeCompletionLabel("Completed yesterday", syncTime), null);
});
