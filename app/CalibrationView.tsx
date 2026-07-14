// app/CalibrationView.tsx
// Predicted vs actual: do markets priced at X% actually resolve YES ~X% of the time?
// Full mode renders a per-bucket chart for the Calibration tab; compact mode a one-line
// summary for the Dashboard. Data is live from Manifold resolved markets. Display-only.

"use client";

import { useEffect, useState } from "react";

type Bucket = { bucket: string; predictedPct: number; actualPct: number | null; n: number };
type Cal = { available: boolean; total?: number; table?: Bucket[] };

function avgErr(table: Bucket[]): { err: number; n: number } {
  let wErr = 0;
  let n = 0;
  for (const b of table) {
    if (b.actualPct === null || b.n === 0) continue;
    wErr += Math.abs(b.predictedPct - b.actualPct) * b.n;
    n += b.n;
  }
  return { err: n ? Math.round(wErr / n) : 0, n };
}

export default function CalibrationView({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Cal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/calibration")
      .then((r) => r.json())
      .then((d: Cal) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setData({ available: false });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---- compact (Dashboard) ----
  if (compact) {
    if (loading) {
      return (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 mb-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Calibration</div>
          <p className="font-mono text-xs text-zinc-600 mt-1">Loading…</p>
        </div>
      );
    }
    if (!data?.available || !data.table) return null;
    const { err, n } = avgErr(data.table);
    return (
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 mb-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          Calibration · Manifold resolved
        </div>
        <p className="font-mono text-xs text-zinc-400 mt-1">
          Across <span className="text-cyan-300">{n}</span> resolved markets, prices missed the
          real outcome rate by <span className="text-cyan-300">{err} pts</span> on average.
        </p>
        <p className="font-mono text-[10px] text-zinc-600 mt-0.5">
          Open the Calibration tab for the full predicted-vs-actual chart.
        </p>
      </div>
    );
  }

  // ---- full (tab) ----
  if (loading) {
    return <p className="font-mono text-xs text-zinc-600 py-8">Loading calibration…</p>;
  }
  if (!data?.available || !data.table) {
    return <p className="font-mono text-xs text-zinc-600 py-8">Calibration data unavailable right now.</p>;
  }

  const { err, n } = avgErr(data.table);
  const rows = data.table.filter((b) => b.n > 0);

  return (
    <div>
      <p className="font-mono text-xs text-zinc-500 mb-1 leading-relaxed max-w-2xl">
        Do market prices match reality? Each row takes every Manifold market that resolved in a
        price band and shows how often it actually resolved Yes. A well-calibrated market lands
        close to the diagonal: priced 70 percent, resolves Yes about 70 percent of the time.
      </p>
      <p className="font-mono text-xs text-zinc-600 mb-4">
        {n} resolved binary markets · average gap {err} pts · play money (Manifold). Not advice.
      </p>

      <div className="rounded-lg border border-zinc-800/80 overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_70px] gap-2 px-4 py-2 bg-zinc-900/90 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Priced</span>
          <span>Actual Yes rate</span>
          <span className="text-right">Markets</span>
        </div>
        {rows.map((b) => {
          const actual = b.actualPct ?? 0;
          const gap = Math.abs(actual - b.predictedPct);
          const barColor =
            gap <= 8 ? "bg-emerald-500/70" : gap <= 18 ? "bg-cyan-400/70" : "bg-rose-500/70";
          return (
            <div
              key={b.bucket}
              className="grid grid-cols-[90px_1fr_70px] gap-2 px-4 py-2 items-center border-t border-zinc-800/60"
            >
              <span className="font-mono text-xs text-zinc-400">{b.bucket}</span>
              <div className="relative">
                <div className="h-3 rounded bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${actual}%` }} />
                </div>
                {/* predicted marker */}
                <div
                  className="absolute top-[-2px] h-4 w-px bg-zinc-300"
                  style={{ left: `${b.predictedPct}%` }}
                  title={`priced ${b.predictedPct}%`}
                />
                <span className="font-mono text-[10px] text-zinc-500 mt-0.5 inline-block">
                  {actual}% resolved Yes · priced ~{b.predictedPct}%
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-500 text-right">{b.n}</span>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10px] text-zinc-600 mt-2">
        The thin vertical line is the price. The bar is what actually happened. Green means the
        market was close, red means it was over or under-confident.
      </p>
    </div>
  );
}
