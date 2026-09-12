// Ticket <-> Doc matching (FR-5/FR-6). Deterministic by design — the spec is
// explicit that "no complex AI needed — keyword matching is sufficient for
// the POC" (spec.md, Story 2.2), so this never calls an LLM, with or without
// GEMINI_API_KEY. It lives under lib/llm/ to match the Architecture Spine's
// file layout, not because it's LLM-backed.

import type { Doc, DocLinksResult, DocMatch, MatchConfidence, SprintData } from '../types';

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from']);

function significantWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

function labelOverlapCount(a: string[], b: string[]): number {
  const bSet = new Set(b.map((l) => l.toLowerCase()));
  return a.filter((l) => bSet.has(l.toLowerCase())).length;
}

function titleSimilarity(ticketTitle: string, docTitle: string): number {
  const ticketWords = significantWords(ticketTitle);
  if (ticketWords.size === 0) return 0;
  const docWords = significantWords(docTitle);
  let shared = 0;
  for (const w of ticketWords) {
    if (docWords.has(w)) shared += 1;
  }
  return shared / ticketWords.size;
}

function scoreMatch(ticketLabels: string[], ticketTitle: string, doc: Doc): number {
  const overlap = labelOverlapCount(ticketLabels, doc.labels);
  const sim = titleSimilarity(ticketTitle, doc.title);
  return overlap * 2 + sim;
}

function confidenceFor(ticketLabels: string[], ticketTitle: string, doc: Doc): MatchConfidence {
  const overlap = labelOverlapCount(ticketLabels, doc.labels);
  const sim = titleSimilarity(ticketTitle, doc.title);
  if (overlap >= 2 || (overlap >= 1 && sim >= 0.5)) return 'high';
  if (overlap === 1 || sim >= 0.5) return 'medium';
  return 'low';
}

export function matchTicketsToDocs(data: SprintData, docs: Doc[]): DocLinksResult {
  const matches: DocMatch[] = [];
  const missingDocTicketIds: string[] = [];
  const referencedDocUrls = new Set<string>();

  for (const ticket of data.tickets) {
    let best: { doc: Doc; score: number } | null = null;
    for (const doc of docs) {
      const score = scoreMatch(ticket.labels, ticket.title, doc);
      if (score > 0 && (!best || score > best.score)) {
        best = { doc, score };
      }
    }

    if (!best) {
      missingDocTicketIds.push(ticket.id);
      continue;
    }

    referencedDocUrls.add(best.doc.url);
    matches.push({
      ticketId: ticket.id,
      doc: best.doc,
      confidence: confidenceFor(ticket.labels, ticket.title, best.doc),
      score: best.score,
    });
  }

  const orphanedDocs = docs.filter((doc) => !referencedDocUrls.has(doc.url));

  return { matches, missingDocTicketIds, orphanedDocs };
}
