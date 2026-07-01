// app/MoversStrip.tsx
// "Top movers" - the markets whose probability shifted most in 24h, each with
// a real price-history sparkline. Real data, real up/down movement. Not a
// recommendation - just where the board is actually moving.

"use client";

import { useEffect, useState } from "react";
import { Market } from "./types";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

type Point = { t: number; yes: number };

function Sparkline({ tokenId, up }: { tokenId?: string; up: boolean }) {
  const [series, setSeries] = useState<Point[] | null>(null);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    fetch(`/api/history?token=${encodeURIComponent(tokenId)}&interval=1w`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSeries(Array.isArray(d.series) ? d.series : []);
      })
      .catch(() => !cancelled && setSeries([]));
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  if (!series || series.length < 2) {
    return <div className="h-8 w-full" />;
  }

  return (
    <div style={{ width: "100%", height: 32 }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <YAxis domain={[0, 100]} hide />
          <Line
            type="monotone"
            dataKey="yes"
            stroke={up ? "#34d399" : "#fb7185"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MoversStrip({ markets }: { markets: Market[] }) {
  // sort by absolute 24h move, take top movers that actually have a clob token
  const movers = markets
    .filter((m) => m.source === "Polymarket" && m.clobTokenId && typeof m.move === "number" && Math.abs(m.move) > 0)
    .sort((a, b) => Math.abs(b.move ?? 0) - Math.abs(a.move ?? 0))
    .slice(0, 4);

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
        top movers · 24h
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {movers.map((m, i) => {
          const move = m.move ?? 0;
          const up = move >= 0;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md bg-zinc-900/50 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs text-zinc-300">{m.question}</div>
                <div className="font-mono text-[10px] text-zinc-600 mt-0.5">
                  {m.yes}% yes
                </div>
              </div>
              <div className="w-20 shrink-0">
                <Sparkline tokenId={m.clobTokenId} up={up} />
              </div>
              <div
                className={`font-mono text-xs shrink-0 w-12 text-right ${
                  up ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {up ? "+" : ""}
                {move}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
