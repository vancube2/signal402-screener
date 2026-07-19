// app/lib/signalScore.ts
// Signal Score: a 0-100 measure of how much OBSERVABLE ACTIVITY is happening in
// a market right now. It is built only from public, factual signals already in
// the data: the size of recent odds movement, trading volume, liquidity, and
// whether a match is live. It is NOT a prediction and NOT betting advice. A high
// score means "a lot is happening here, worth a look," never "this is a good bet."
//
// Every input is optional. A market contributes only the signals it actually has.
// Nothing is invented to fill a gap.

import { Market } from "../types";

export type SignalBand = "stable" | "watching" | "active" | "high";

export type SignalResult = {
  score: number; // 0-100
  band: SignalBand;
  label: string; // human label for the band
  reasons: string[]; // plain-language factors that drove the score
};

const BANDS: Record<SignalBand, { label: string; min: number }> = {
  stable: { label: "Stable", min: 0 },
  watching: { label: "Watching", min: 30 },
  active: { label: "Active", min: 55 },
  high: { label: "High activity", min: 78 },
};

function bandFor(score: number): SignalBand {
  if (score >= BANDS.high.min) return "high";
  if (score >= BANDS.active.min) return "active";
  if (score >= BANDS.watching.min) return "watching";
  return "stable";
}

// log-scale a value into 0..1 against a soft ceiling, so huge outliers do not
// dominate and small markets are not flattened to zero.
function logNorm(value: number, ceiling: number): number {
  if (value <= 0) return 0;
  const v = Math.log10(1 + value);
  const c = Math.log10(1 + ceiling);
  return Math.max(0, Math.min(1, v / c));
}

export function signalScore(
  m: Market,
  allMarkets?: Market[],
  disagreementIndex?: Map<string, Market[]>
): SignalResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Movement: absolute 24h change in points. This is the strongest activity
  //    signal, a market whose odds are moving is where things are happening.
  if (m.move != null && !Number.isNaN(m.move)) {
    const mv = Math.abs(m.move);
    const mvNorm = Math.max(0, Math.min(1, mv / 20)); // 20+ pts = full
    score += mvNorm * 45;
    if (mv >= 10) reasons.push(`Odds moved ${mv.toFixed(0)} pts in 24h`);
    else if (mv >= 4) reasons.push(`Odds moved ${mv.toFixed(0)} pts in 24h`);
  }

  // 2. Volume: more trading = more activity. Log-scaled against a soft ceiling.
  if (m.volume > 0) {
    const volNorm = logNorm(m.volume, 500000);
    score += volNorm * 30;
    if (volNorm > 0.66) reasons.push("High trading volume");
    else if (volNorm > 0.4) reasons.push("Active trading volume");
  }

  // 3. Liquidity: depth behind the activity.
  if (m.liquidity > 0) {
    const liqNorm = logNorm(m.liquidity, 200000);
    score += liqNorm * 12;
    if (liqNorm > 0.6) reasons.push("Deep liquidity");
  }

  // 4. Live match: an in-running fixture is inherently active.
  if (m.inRunning) {
    score += 15;
    reasons.push("Match in play");
  } else if (m.gameState === "Live") {
    score += 12;
    reasons.push("Live now");
  }

  // 5. Cross-market disagreement: if the same question appears on another source
  //    with a meaningfully different implied probability, that gap is a real,
  //    observable signal worth surfacing. Uses a prebuilt index for O(1) lookup.
  if (m.yes >= 0) {
    const key = normKey(m.question);
    const peers = disagreementIndex?.get(key);
    let other: Market | undefined;
    if (peers) {
      other = peers.find((x) => x !== m && x.source !== m.source && x.yes >= 0);
    } else if (allMarkets) {
      other = allMarkets.find(
        (x) =>
          x !== m &&
          x.source !== m.source &&
          x.yes >= 0 &&
          sameQuestion(x.question, m.question)
      );
    }
    if (other) {
      const gap = Math.abs(other.yes - m.yes);
      if (gap >= 5) {
        const gapNorm = Math.min(1, gap / 25);
        score += gapNorm * 18;
        reasons.push(`${gap.toFixed(0)} pt gap vs ${other.source}`);
      }
    }
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  const band = bandFor(score);
  return { score, band, label: BANDS[band].label, reasons };
}

// normalized key for question matching
export function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

// build a question -> markets index once, so disagreement lookup is O(1) per market
export function buildDisagreementIndex(markets: Market[]): Map<string, Market[]> {
  const idx = new Map<string, Market[]>();
  for (const m of markets) {
    if (m.yes < 0) continue;
    const k = normKey(m.question);
    const arr = idx.get(k) ?? [];
    arr.push(m);
    idx.set(k, arr);
  }
  return idx;
}

// loose match: same question text ignoring case and trailing punctuation.
function sameQuestion(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return norm(a) === norm(b);
}

// colors for the row indicator dot (CSS, not emoji)
export const BAND_COLOR: Record<SignalBand, string> = {
  stable: "#34d399", // emerald
  watching: "#fbbf24", // amber
  active: "#fb923c", // orange
  high: "#fb7185", // rose
};
