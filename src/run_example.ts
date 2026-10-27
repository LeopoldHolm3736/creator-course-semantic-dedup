import { createCollection, indexAndClassify } from "./semantic_deduplication.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example");

const collection = process.env.INFRAI_COLLECTION ?? "course-delivery-records";
await createCollection(collection, 1536, key);
const result = await indexAndClassify({
  id: "lesson-042-revised",
  courseId: "typescript-for-teachers",
  title: "Assessment feedback for the async lesson",
  body: "Learners submit a small async function and receive feedback on readable control flow.",
  subscriberUpdate: "The revised lesson adds one worked example before the practice task.",
}, collection, key);
console.log(JSON.stringify(result, null, 2));
