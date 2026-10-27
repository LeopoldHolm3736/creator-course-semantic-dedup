export type SimilarRecord = { id: string; score: number; metadata?: Record<string, unknown> };

export function decideDuplicate(similar: SimilarRecord[], threshold = 0.9): { action: "merge" | "keep"; matchId?: string } {
  const match = similar.find((item) => item.score >= threshold);
  return match ? { action: "merge", matchId: match.id } : { action: "keep" };
}
