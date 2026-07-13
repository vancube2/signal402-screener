import type { TrustInputs } from "./intel-types";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

export interface TrustScore {
  score: number;                 // 0..100
  band: "low" | "medium" | "high";
  factors: { name: string; contribution: number; note: string }[];
}

// Source base reliability. Manifold is play money with a known YES bias, so it starts lower.
const SOURCE_BASE: Record<TrustInputs["source"], number> = {
  polymarket: 62,
  txline: 60,
  manifold: 44,
};

function fmtMoney(n: number, source: TrustInputs["source"]): string {
  const p = source === "manifold" ? "Ṁ" : "$";
  if (n >= 1_000_000) return `${p}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${p}${(n / 1_000).toFixed(1)}K`;
  return `${p}${Math.round(n)}`;
}

// A transparent, tunable composite. Every input is optional; missing inputs just don't move
// the score. This tells the viewer how much to trust the probability, not what to do.
export function trustScore(inp: TrustInputs): TrustScore {
  const factors: TrustScore["factors"] = [];
  let score = SOURCE_BASE[inp.source];
  factors.push({ name: "source", contribution: score, note: `${inp.source} baseline` });

  const money = inp.liquidity ?? inp.volume;
  if (money !== undefined) {
    // log-scaled: ~+0 at $100, ~+18 at $1M, capped
    const bonus = clamp(Math.log10(Math.max(money, 1)) * 3 - 6, 0, 18);
    score += bonus;
    factors.push({ name: "liquidity", contribution: round(bonus), note: `depth/volume ~${fmtMoney(money, inp.source)}` });
  }

  if (inp.topHolderSharePct !== undefined) {
    // concentration penalty: nothing under 25%, up to -15 as one wallet nears the whole book
    const pen = -clamp((inp.topHolderSharePct - 25) * 0.3, 0, 15);
    score += pen;
    if (pen < 0) factors.push({ name: "concentration", contribution: round(pen), note: `top holder ${round(inp.topHolderSharePct)}%` });
  }

  if (inp.ageDays !== undefined && inp.ageDays < 2) {
    score -= 8;
    factors.push({ name: "age", contribution: -8, note: "very new market" });
  }

  if (inp.spreadPts !== undefined && inp.spreadPts > 5) {
    const pen = -clamp((inp.spreadPts - 5) * 0.8, 0, 12);
    score += pen;
    factors.push({ name: "spread", contribution: round(pen), note: `wide spread ${round(inp.spreadPts)} pts` });
  }

  score = round(clamp(score, 0, 100));
  const band = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, band, factors };
}
