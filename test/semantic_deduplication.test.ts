import assert from "node:assert/strict";
import { decideDuplicate } from "../src/duplicate_decision.ts";

const duplicate = decideDuplicate([{ id: "lesson-041", score: 0.94 }]);
assert.deepEqual(duplicate, { action: "merge", matchId: "lesson-041" });

const newLesson = decideDuplicate([{ id: "lesson-009", score: 0.71 }]);
assert.deepEqual(newLesson, { action: "keep" });
console.log("semantic decision test passed");
