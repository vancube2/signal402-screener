import type { AlignedPoint, MatchedGroup } from "./intel-types";
import { alignGroup } from "./match";
import type { Source } from "./types";

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export interface Divergence {
  key: string;
  subject?: string;
  points: { source: Source; probPct: number }[];
  spreadPts: number;                 // widest gap across sources, in points
  widest: { a: Source; b: Source; deltaPts: number };
  note: string;                      // neutral, observational
}

// Compare the aligned per-source probabilities for one event. Returns null when fewer
// than two sources are comparable. This surfaces a spread, never a recommendation.
export function divergenceForGroup(group: MatchedGroup, referenceSubject?: string): Divergence | null {
  const aligned: AlignedPoint[] = alignGroup(group, referenceSubject);
  if (aligned.length < 2) return null;

  const points = aligned.map((p) => ({ source: p.source, probPct: round(p.prob * 100) }));
  let lo = aligned[0], hi = aligned[0];
  for (const p of aligned) {
    if (p.prob < lo.prob) lo = p;
    if (p.prob > hi.prob) hi = p;
  }
  const spreadPts = round((hi.prob - lo.prob) * 100);
  const note =
    spreadPts === 0
      ? "Sources agree on this event"
      : `${hi.source} implies ${round(hi.prob * 100)}%, ${lo.source} implies ${round(lo.prob * 100)}%, a ${spreadPts} pt spread`;

  return {
    key: group.key,
    subject: aligned[0].subject,
    points,
    spreadPts,
    widest: { a: hi.source, b: lo.source, deltaPts: spreadPts },
    note,
  };
}

// Scan a whole board and return the biggest cross-source disagreements first.
export function divergenceFeed(groups: MatchedGroup[]): Divergence[] {
  return groups
    .map((g) => divergenceForGroup(g))
    .filter((d): d is Divergence => d !== null && d.spreadPts > 0)
    .sort((a, b) => b.spreadPts - a.spreadPts);
}
