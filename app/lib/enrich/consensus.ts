import type { AlignedPoint, MatchedGroup } from "./intel-types";
import { alignGroup } from "./match";
import type { Source } from "./types";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

export interface Consensus {
  probabilityPct: number;                 // liquidity-weighted blended probability
  bandPct: [number, number];              // confidence band, tighter when sources agree
  spreadPts: number;                      // raw disagreement across sources
  contributors: { source: Source; probPct: number; weightPct: number }[];
}

// Blend the aligned per-source probabilities into one number, weighted by liquidity, with a
// confidence band that widens with disagreement and narrows with more agreeing weight.
export function consensusForGroup(group: MatchedGroup, referenceSubject?: string): Consensus | null {
  const pts: AlignedPoint[] = alignGroup(group, referenceSubject);
  if (pts.length === 0) return null;

  const totalW = pts.reduce((s, p) => s + p.weight, 0) || 1;
  const mean = pts.reduce((s, p) => s + p.prob * p.weight, 0) / totalW;

  // weighted standard deviation of the source probabilities
  const variance = pts.reduce((s, p) => s + p.weight * (p.prob - mean) ** 2, 0) / totalW;
  const stdev = Math.sqrt(variance);

  const spreadPts = round((Math.max(...pts.map((p) => p.prob)) - Math.min(...pts.map((p) => p.prob))) * 100);

  // band half-width: disagreement term + a small floor that shrinks as total weight grows
  const half = clamp01(stdev * 1.5 + 0.02 + 0.15 / (1 + Math.log10(1 + totalW)));

  return {
    probabilityPct: round(mean * 100),
    bandPct: [round(clamp01(mean - half) * 100), round(clamp01(mean + half) * 100)],
    spreadPts,
    contributors: pts.map((p) => ({
      source: p.source,
      probPct: round(p.prob * 100),
      weightPct: round((p.weight / totalW) * 100),
    })),
  };
}
