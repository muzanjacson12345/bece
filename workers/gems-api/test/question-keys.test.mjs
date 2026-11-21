import test from "node:test";
import assert from "node:assert/strict";
import {
  FIXED_QUESTION_KEY_COUNT,
  getCorrectAnswer,
  isCorrectAnswer,
  isKnownQuestionId
} from "../src/question-keys.mjs";

test("all 200 original question records have fixed answer keys", () => {
  assert.equal(FIXED_QUESTION_KEY_COUNT, 200);
  assert.equal(getCorrectAnswer("soc-1"), "B");
  assert.equal(getCorrectAnswer("soc-100"), "B");
  assert.equal(getCorrectAnswer("art-1"), "A");
  assert.equal(getCorrectAnswer("art-100"), "B");
});

test("generated question answer positions match makeExtraMCQ option rotation", () => {
  assert.equal(getCorrectAnswer("mat-101"), "D");
  assert.equal(getCorrectAnswer("mat-102"), "C");
  assert.equal(getCorrectAnswer("mat-103"), "B");
  assert.equal(getCorrectAnswer("mat-104"), "A");
  assert.equal(getCorrectAnswer("ct-200"), "A");
});

test("generated ID ranges include the exact subject bank ranges", () => {
  for (const id of [
    "mat-101", "mat-200", "com-101", "com-200",
    "soc-101", "soc-200", "art-101", "art-200",
    "rme-115", "rme-200", "sci-27", "sci-200",
    "fre-1", "fre-200", "ct-1", "ct-200"
  ]) assert.ok(isKnownQuestionId(id), id);
  for (const id of [
    "mat-100", "mat-201", "rme-114", "sci-26",
    "fre-0", "ct-201", "unknown-1", "soc-01", "../soc-1"
  ]) assert.equal(isKnownQuestionId(id), false, id);
});

test("answers are checked by the Worker, not accepted as client-declared correctness", () => {
  assert.equal(isCorrectAnswer("soc-1", "B"), true);
  assert.equal(isCorrectAnswer("soc-1", "A"), false);
  assert.equal(isCorrectAnswer("mat-101", "D"), true);
  assert.equal(isCorrectAnswer("mat-101", "A"), false);
  assert.equal(isCorrectAnswer("soc-1", "b"), false);
  assert.equal(isCorrectAnswer("unknown-1", "A"), false);
});
