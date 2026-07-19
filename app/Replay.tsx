// app/Replay.tsx
// Replay: "time travel" for a market. Fetches the real normalized history from
// /api/market-history and lets the user scrub through it with a slider or play it
// back. Every point is real data from the source. If a market has no history, it
// says so plainly rather than inventing a line.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Market } from "./types";

type Point = { t: number; yes: number };

function historyUrl(m: Market): string | null {
  if (m.source === "Polymarket" && m.clobTokenId)
    return `/api/market-history?source=Polymarket&clob=${encodeURIComponent(m.clobTokenId)}`;
  if (m.source === "Manifold" && m.marketId)
    return `/api/market-history?source=Manifold&manifold=${encodeURIComponent(m.marketId)}`;
  if (m.source === "TxLINE" && m.fixtureId)
    return `/api/market-history?source=TxLINE&fixture=${encodeURIComponent(m.fixtureId)}`;
  return null;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtVol(n: number, realMoney: boolean): string {
  if (!n || n <= 0) return "";
  const unit = realMoney ? "$" : "";
  if (n >= 1_000_000) return `${unit}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${unit}${(n / 1_000).toFixed(0)}K`;
  return `${unit}${Math.round(n)}`;
}

export default function Replay({ market }: { market: Market }) {
  const url = historyUrl(market);
  const [series, setSeries] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const s: Point[] = Array.isArray(d.series) ? d.series : [];
        setSeries(s);
        setIdx(s.length > 0 ? s.length - 1 : 0); // start at "now"
      })
      .catch(() => !cancelled && setErr("history unavailable"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  // playback
  useEffect(() => {
    if (!playing || series.length < 2) return;
    timer.current = setInterval(() => {
      setIdx((i) => {
        if (i >= series.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 120);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, series.length]);

  const stats = useMemo(() => {
    if (series.length === 0) return null;
    const ys = series.map((p) => p.yes);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    return { min, max, range: max - min };
  }, [series]);

  if (!url) return null;

  const cur = series[idx];
  const first = series[0];
  const delta = cur && first ? cur.yes - first.yes : 0;

  // build a simple sparkline path over the full series
  const spark = useMemo(() => {
    if (series.length < 2) return "";
    const w = 100;
    const h = 28;
    const ys = series.map((p) => p.yes);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min || 1;
    return series
      .map((p, i) => {
        const x = (i / (series.length - 1)) * w;
        const y = h - ((p.yes - min) / span) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [series]);

  const markerX =
    series.length > 1 ? (idx / (series.length - 1)) * 100 : 0;

  return (
    <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
          Replay
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          {loading
            ? "loading history…"
            : series.length > 0
            ? `${series.length} points`
            : ""}
        </span>
      </div>

      {err && (
        <div className="font-mono text-[10px] text-rose-400/80">{err}</div>
      )}

      {!loading && !err && series.length < 2 && (
        <div className="font-mono text-[10px] text-zinc-500">
          No price history available for this market yet.
        </div>
      )}

      {series.length >= 2 && (
        <div className="space-y-2.5">
          {/* current point readout */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-2xl font-bold tabular-nums text-zinc-100">
                {cur?.yes}%
              </div>
              {market.realMoney && cur && (
                <div className="font-mono text-[11px] tabular-nums text-emerald-300/90">
                  ${(cur.yes / 100).toFixed(2)}{" "}
                  <span className="text-zinc-600">per Yes share</span>
                </div>
              )}
              <div className="font-mono text-[10px] text-zinc-500">
                {cur ? fmtTime(cur.t) : ""}
              </div>
              {fmtVol(market.volume, market.realMoney) && (
                <div className="font-mono text-[10px] text-zinc-600 mt-0.5">
                  Vol {fmtVol(market.volume, market.realMoney)}{" "}
                  <span className="text-zinc-700">(current total)</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div
                className={`font-mono text-xs tabular-nums ${
                  delta > 0
                    ? "text-emerald-400"
                    : delta < 0
                    ? "text-rose-400"
                    : "text-zinc-500"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta} pts
              </div>
              <div className="font-mono text-[9px] text-zinc-600">
                since start
              </div>
            </div>
          </div>

          {/* sparkline with playhead */}
          <div className="relative">
            <svg
              viewBox="0 0 100 28"
              preserveAspectRatio="none"
              className="w-full h-8"
            >
              <path
                d={spark}
                fill="none"
                stroke="#34d399"
                strokeWidth="1"
                opacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={markerX}
                y1="0"
                x2={markerX}
                y2="28"
                stroke="#34d399"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* slider + play */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (idx >= series.length - 1) setIdx(0);
                setPlaying((p) => !p);
              }}
              className="font-mono text-[10px] rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800 w-12"
            >
              {playing ? "pause" : "play"}
            </button>
            <input
              type="range"
              min={0}
              max={series.length - 1}
              value={idx}
              onChange={(e) => {
                setPlaying(false);
                setIdx(Number(e.target.value));
              }}
              className="flex-1 accent-emerald-400"
            />
          </div>

          {stats && (
            <div className="font-mono text-[9px] text-zinc-600">
              Range {stats.min}% to {stats.max}% ({stats.range} pts) over this
              window. Real history from {market.source}. Not a prediction.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
