// app/Dashboard.tsx
// Aggregate "state of the board" view. Pure client-side derivation from the
// markets array, so it updates automatically with the periodic refresh.
// No recommendations - just the shape of the data.

"use client";

import { Market } from "./types";
import TrendChart, { TrendPoint } from "./TrendChart";
import MoversStrip from "./MoversStrip";

function fmtMoney(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Dashboard({ markets, history }: { markets: Market[]; history: TrendPoint[] }) {
  const total = markets.length;
  const realCount = markets.filter((m) => m.realMoney).length;
  const playCount = total - realCount;

  // total volume across all markets
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  // average Yes probability (only where we have a real number)
  const withYes = markets.filter(
    (m) => typeof m.yes === "number" && !isNaN(m.yes)
  );
  const avgYes =
    withYes.length > 0
      ? Math.round(withYes.reduce((s, m) => s + m.yes, 0) / withYes.length)
      : 0;

  // probability distribution buckets
  const longshots = withYes.filter((m) => m.yes < 25).length; // 0-24
  const tossups = withYes.filter((m) => m.yes >= 25 && m.yes < 75).length; // 25-74
  const favorites = withYes.filter((m) => m.yes >= 75).length; // 75-100
  const distTotal = longshots + tossups + favorites || 1;
  const pct = (n: number) => (n / distTotal) * 100;

  const tiles = [
    { label: "markets", value: total.toString(), sub: `${realCount} real · ${playCount} play` },
    { label: "total volume", value: fmtMoney(totalVolume), sub: "across all sources" },
    { label: "avg yes", value: `${avgYes}%`, sub: "board-wide probability" },
    { label: "sources", value: "2", sub: "Polymarket · Manifold" },
  ];

  return (
    <div className="mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
      {/* stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md bg-zinc-900/60 px-3 py-2.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              {t.label}
            </div>
            <div className="font-mono text-xl font-bold text-amber-400 mt-0.5">
              {t.value}
            </div>
            <div className="font-mono text-[10px] text-zinc-600 mt-0.5">
              {t.sub}
            </div>
          </div>
        ))}
      </div>

      {/* probability distribution bar */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">
          probability spread · {distTotal} priced markets
        </div>
        <div className="flex h-6 w-full overflow-hidden rounded-md">
          <div
            className="bg-rose-500/70 flex items-center justify-center"
            style={{ width: `${pct(longshots)}%` }}
            title={`${longshots} longshots (under 25%)`}
          />
          <div
            className="bg-zinc-500/60 flex items-center justify-center"
            style={{ width: `${pct(tossups)}%` }}
            title={`${tossups} tossups (25-75%)`}
          />
          <div
            className="bg-emerald-500/70 flex items-center justify-center"
            style={{ width: `${pct(favorites)}%` }}
            title={`${favorites} favorites (over 75%)`}
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1.5">
          <span className="text-rose-400/80">{longshots} longshots &lt;25%</span>
          <span className="text-zinc-500">{tossups} tossups</span>
          <span className="text-emerald-400/80">{favorites} favorites &gt;75%</span>
        </div>
      </div>
      <MoversStrip markets={markets} />
      <TrendChart history={history} />
    </div>
  );
}
