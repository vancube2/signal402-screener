// app/lib/enrich/adapt.ts
// Bridge the app's Market shape (yes/no as 0..100, capitalized source) into the
// enrichment layer's NormalizedMarket (priceYes 0..1, lowercase source).

import type { Market } from "../../types";
import { categorize } from "./categorize";
import type { Category, NormalizedMarket, Source } from "./types";

const SOURCE_MAP: Record<Market["source"], Source> = {
  Polymarket: "polymarket",
  Manifold: "manifold",
  TxLINE: "txline",
};

// For a sports fixture "A vs B", the YES probability refers to A.
function inferSubject(question: string): string | undefined {
  const m = question.match(/^(.+?)\s+(?:vs\.?|v\.?)\s+/i);
  return m ? m[1].trim() : undefined;
}

export function marketToNormalized(m: Market): NormalizedMarket {
  const known = typeof m.yes === "number" && m.yes >= 0;
  return {
    id: m.fixtureId ?? m.clobTokenId ?? m.url ?? m.question,
    source: SOURCE_MAP[m.source],
    question: m.question,
    description: m.description || undefined,
    priceYes: known ? m.yes / 100 : 0.5, // callers should guard on `known` before showing payoff
    consensusYes: m.source === "TxLINE" && known ? m.yes / 100 : undefined,
    subject: m.source === "TxLINE" ? inferSubject(m.question) : undefined,
    volume: m.volume,
    liquidity: m.liquidity || undefined,
    moneyKind: m.source === "TxLINE" ? "none" : m.realMoney ? "real" : "play",
    closesAt: m.closeDate ? Date.parse(m.closeDate) || undefined : undefined,
    resolved: false,
    outcome: null,
  };
}

// Convenience: categories for one app Market.
export function categoriesForMarket(m: Market): Category[] {
  return categorize(marketToNormalized(m));
}
