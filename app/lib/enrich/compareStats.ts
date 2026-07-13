// app/lib/enrich/compareStats.ts
// Precise cross-source grouping + divergence/consensus for the Compare view.

import type { Market } from "../../types";
import type { MatchGroup } from "../../compare";
import { marketToNormalized } from "./adapt";
import { eventKeyOf } from "./match";
import { divergenceForGroup, type Divergence } from "./divergence";
import { consensusForGroup, type Consensus } from "./consensus";
import type { MatchedGroup } from "./intel-types";

// A stricter match key than keyword overlap. Sports "Will X win TOURNAMENT" markets
// key on team + tournament, with tournament phrasing collapsed so "2026 FIFA World Cup"
// and "World Cup" match. Everything else keys on its exact normalized question.
function matchKey(m: Market): string {
  const ek = eventKeyOf({ question: m.question });
  if (ek.kind === "outright") {
    return ek.key
      .replace(/\b(19|20)\d{2}\b/g, "")
      .replace(/\bfifa\b/g, "")
      .replace(/:\s+/g, ":")
      .replace(/\s+/g, " ")
      .trim();
  }
  return ek.key;
}

// Group markets that are truly the same question across sources. One representative per
// source (highest volume), and only groups where 2+ distinct sources cover it.
export function crossSourceGroups(markets: Market[]): MatchGroup[] {
  const priced = markets.filter((m) => m.yes >= 0);
  const byKey = new Map<string, Market[]>();
  for (const m of priced) {
    const k = matchKey(m);
    const arr = byKey.get(k) ?? [];
    arr.push(m);
    byKey.set(k, arr);
  }

  const groups: MatchGroup[] = [];
  for (const ms of byKey.values()) {
    const bestBySource = new Map<Market["source"], Market>();
    for (const m of ms) {
      const cur = bestBySource.get(m.source);
      if (!cur || m.volume > cur.volume) bestBySource.set(m.source, m);
    }
    const reps = [...bestBySource.values()];
    if (reps.length < 2) continue; // need at least two different sources

    const label =
      reps.find((m) => m.source === "Polymarket")?.question ??
      [...reps].sort((a, b) => b.question.length - a.question.length)[0].question;

    groups.push({ label, markets: [...reps].sort((a, b) => b.volume - a.volume) });
  }

  // most-divergent first
  return groups.sort((a, b) => spread(b.markets) - spread(a.markets));
}

function spread(ms: Market[]): number {
  const ys = ms.map((m) => m.yes);
  return Math.max(...ys) - Math.min(...ys);
}

export interface GroupStats {
  divergence: Divergence | null;
  consensus: Consensus | null;
  hasPlayMoney: boolean;
}

export function groupStats(markets: Market[], label: string): GroupStats {
  const priced = markets.filter((m) => m.yes >= 0);
  const members = priced.map(marketToNormalized);
  const group: MatchedGroup = { key: label, kind: "generic", members };
  return {
    divergence: divergenceForGroup(group),
    consensus: consensusForGroup(group),
    hasPlayMoney: priced.some((m) => !m.realMoney && m.source !== "TxLINE"),
  };
}
