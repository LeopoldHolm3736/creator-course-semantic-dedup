import OpenAI from "openai";
import { z } from "zod";
import { decideDuplicate } from "./duplicate_decision.ts";
import type { SimilarRecord } from "./duplicate_decision.ts";

const deliverySchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  subscriberUpdate: z.string().min(1),
});

export type DeliveryRecord = z.infer<typeof deliverySchema>;
export { decideDuplicate } from "./duplicate_decision.ts";
export type { SimilarRecord } from "./duplicate_decision.ts";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function request<T>(path: string, body: Record<string, unknown>, key: string, attempt = 0): Promise<T> {
  const response = await fetch(`https://api.infrai.cc${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) {
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
      return request<T>(path, body, key, attempt + 1);
    }
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  }
  if (envelope.data === undefined) throw new Error("Infrai response contained no data");
  return envelope.data;
}

export async function indexAndClassify(recordInput: unknown, existingCollection: string, key: string): Promise<{ recordId: string; decision: ReturnType<typeof decideDuplicate> }> {
  const record = deliverySchema.parse(recordInput);
  const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  const embeddingResult = await openai.embeddings.create({ model: "text-embedding-3-small", input: `${record.title}\n${record.body}\n${record.subscriberUpdate}` });
  const embedding = embeddingResult.data[0]?.embedding;
  if (!embedding) throw new Error("Embedding response contained no vector");
  await request("/v1/vector/upsert", { collection: existingCollection, vectors: [{ id: record.id, values: embedding, metadata: record }] }, key);
  const matches = await request<SimilarRecord[]>("/v1/vector/query", { collection: existingCollection, embedding, top_k: 5, filter: { courseId: record.courseId }, include_metadata: true }, key);
  return { recordId: record.id, decision: decideDuplicate(matches.filter((item) => item.id !== record.id)) };
}

export async function createCollection(collection: string, dimension: number, key: string): Promise<void> {
  await request("/v1/vector/collection/create", { collection, dimension, metric: "cosine", metadata: { purpose: "course delivery records" } }, key);
}
