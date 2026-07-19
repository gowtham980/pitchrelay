/**
 * Decision card generation facade.
 * Prefers live LLM when configured; always falls back to deterministic mock cards.
 */
import type { DecisionCard, Role } from "@/domain/types";
import { attachDecisionCard } from "@/lib/store";
import { liveDecisionCard } from "./decisionLive";
import { mockDecisionCard } from "./decisionMock";
import { getLlmMode } from "./llm";

export type GenerateDecisionInput = {
  incidentId?: string;
  prompt?: string;
  role?: Role;
};

export type GenerateDecisionResult = {
  card: DecisionCard;
  mode: "live" | "mock";
};

export async function generateDecisionCard(
  input: GenerateDecisionInput,
): Promise<GenerateDecisionResult> {
  const role = input.role ?? "ops";
  let mode: "live" | "mock" = "mock";
  let card: DecisionCard | null = null;

  if (getLlmMode() === "live") {
    card = await liveDecisionCard({ ...input, role });
    if (card) mode = "live";
  }
  if (!card) {
    card = mockDecisionCard({ ...input, role });
    mode = "mock";
  }

  attachDecisionCard(input.incidentId, card);
  return { card, mode };
}
