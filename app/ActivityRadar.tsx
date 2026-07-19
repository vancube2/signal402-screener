// app/ActivityRadar.tsx
// Activity Radar: surfaces where the board is MOST ACTIVE right now, ranked by the
// Signal Score (observable activity: movement, volume, liquidity, live state,
// cross-market disagreement). It answers "where is something happening," never
// "what should I bet." Neutral by design.

"use client";

import { useMemo } from "react";
import { Market } from "./types";
import {
  signalScore,
  buildDisagreementIndex,
  BAND_COLOR,
} from "./lib/signalScore";

export default function ActivityRadar({ markets }: { markets: Market[] }) {
  const top = useMemo(() => {
    const index = buildDisagreementIndex(markets);
    return markets
      .map((m) => ({ m, sig: signalScore(m, markets, index) }))
      .filter((r) => r.sig.score > 0)
      .sort((a, b) => b.sig.score - a.sig.score)
      .slice(0, 5);
  }, [markets]);

  if (top.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
          Activity Radar
        </span>
        <span className="font-mono text-[9px] text-zinc-600">
          most active now
        </span>
      </div>

      <div className="space-y-1.5">
        {top.map(({ m, sig }, i) => (
          <div
            key={m.question + i}
            className="flex items-center gap-2.5 py-1"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: BAND_COLOR[sig.band] }}
            />
            <span className="font-mono text-xs tabular-nums text-zinc-400 w-7 shrink-0">
              {sig.score}
            </span>
            <span className="text-xs text-zinc-200 truncate flex-1 min-w-0">
              {m.question}
            </span>
            <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[45%] text-right hidden sm:block">
              {sig.reasons[0] || sig.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 font-mono text-[9px] text-zinc-600">
        Ranked by observable activity: movement, volume, liquidity, live state,
        cross-market gaps. Not a prediction or advice.
      </div>
    </div>
  );
}
