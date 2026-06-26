// app/compare.ts
// Cross-platform matching: find markets that appear to be about the same
// question across different sources. Conservative keyword-overlap method.

import { Market } from "./types";

const STOP = new Set([
  "will", "the", "a", "an", "be", "by", "to", "of", "in", "on", "for", "and",
  "or", "is", "are", "at", "with", "this", "that", "before", "after", "than",
  "any", "have", "has", "do", "does", "it", "its", "as", "if", "no", "yes",
  "market", "resolve", "resolves", "end", "2026", "2027", "vs",
]);

function keywords(question: string): Set<string> {
  return new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9$%\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  const smaller = Math.min(a.size, b.size);
  return smaller === 0 ? 0 : shared / smaller;
}

export type MatchGroup = {
  label: string;
  markets: Market[];
};

// Returns groups where the SAME question appears on more than one source.
export function findCrossPlatform(markets: Market[]): MatchGroup[] {
  // pre-compute keywords
  const withKw = markets.map((m) => ({ m, kw: keywords(m.question) }));
  const used = new Set<number>();
  const groups: MatchGroup[] = [];

  for (let i = 0; i < withKw.length; i++) {
    if (used.has(i)) continue;
    const base = withKw[i];
    if (base.kw.size < 2) continue; // too vague to match safely

    const groupItems: Market[] = [base.m];
    const groupSources = new Set<string>([base.m.source]);

    for (let j = i + 1; j < withKw.length; j++) {
      if (used.has(j)) continue;
      const other = withKw[j];
      // only pair across DIFFERENT sources
      if (other.m.source === base.m.source) continue;
      // require strong keyword overlap (conservative)
      if (overlap(base.kw, other.kw) >= 0.6) {
        groupItems.push(other.m);
        groupSources.add(other.m.source);
        used.add(j);
      }
    }

    // only keep groups that actually span 2+ sources
    if (groupSources.size >= 2) {
      used.add(i);
      groups.push({ label: base.m.question, markets: groupItems });
    }
  }

  // sort groups by total volume so the biggest comparisons surface first
  groups.sort((a, b) => {
    const av = a.markets.reduce((s, m) => s + m.volume, 0);
    const bv = b.markets.reduce((s, m) => s + m.volume, 0);
    return bv - av;
  });

  return groups;
}
