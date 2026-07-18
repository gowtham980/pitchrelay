import fs from "fs";
import path from "path";
import { dataPath } from "@/lib/paths";
import type { StadiumGraph } from "@/domain/types";
import { getNode } from "@/domain/graph";

export interface KbChunk {
  id: string;
  source: string;
  title: string;
  text: string;
  tokens: string[];
}

let cache: KbChunk[] | null = null;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function loadKb(): KbChunk[] {
  if (cache) return cache;
  const dir = dataPath("kb");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const chunks: KbChunk[] = [];

  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, "utf-8");
    const sections = raw.split(/\n(?=## )/);
    sections.forEach((section, i) => {
      const lines = section.trim().split("\n");
      const title = lines[0]?.replace(/^#+\s*/, "") || file;
      const text = section.trim();
      chunks.push({
        id: `${file}#${i}`,
        source: `data/kb/${file}`,
        title,
        text,
        tokens: tokenize(text),
      });
    });
  }
  cache = chunks;
  return chunks;
}

/** Reset KB cache (tests) */
export function resetKbCache() {
  cache = null;
}

export function retrieveKb(query: string, limit = 4): KbChunk[] {
  const qTokens = new Set(tokenize(query));
  if (!qTokens.size) return loadKb().slice(0, limit);

  const scored = loadKb().map((chunk) => {
    let score = 0;
    for (const t of qTokens) {
      if (chunk.tokens.includes(t)) score += 2;
      if (chunk.title.toLowerCase().includes(t)) score += 3;
      if (chunk.text.toLowerCase().includes(t)) score += 1;
    }
    // light boosts
    if (query.toLowerCase().includes("ada") || query.toLowerCase().includes("wheelchair") || query.toLowerCase().includes("silla")) {
      if (chunk.source.includes("accessibility")) score += 5;
    }
    if (query.toLowerCase().includes("gate") || query.toLowerCase().includes("puerta")) {
      if (chunk.source.includes("gates")) score += 4;
    }
    if (query.toLowerCase().includes("medical") || query.toLowerCase().includes("aed")) {
      if (chunk.source.includes("safety")) score += 4;
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

export function graphFacts(graph: StadiumGraph, nodeIds: string[] = []): string[] {
  const facts: string[] = [
    `Venue: ${graph.meta.venueName} (${graph.meta.city}), capacity ${graph.meta.capacity}.`,
  ];
  for (const id of nodeIds) {
    const n = getNode(graph, id);
    if (!n) continue;
    facts.push(
      `Node ${n.id}: ${n.name} [${n.type}] floor ${n.floor}; wheelchair=${n.accessibility.wheelchair}${n.description ? `; ${n.description}` : ""}`,
    );
  }
  return facts;
}

export function buildGroundedContext(
  graph: StadiumGraph,
  query: string,
  extraNodeIds: string[] = [],
): { context: string; citations: string[] } {
  const chunks = retrieveKb(query);
  const citations = chunks.map((c) => c.source);
  const kbText = chunks.map((c) => `### ${c.title} (${c.source})\n${c.text}`).join("\n\n");
  const facts = graphFacts(graph, extraNodeIds).join("\n");
  const context = `## Graph facts\n${facts}\n\n## Knowledge base\n${kbText || "(no KB hits)"}`;
  return { context, citations: [...new Set(citations)] };
}
