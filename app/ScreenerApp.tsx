// app/ScreenerApp.tsx
// Client wrapper: toggles between the Screener table and the Compare view

"use client";

import { useState, useEffect } from "react";
import { Market } from "./types";
import MarketTable from "./MarketTable";
import Dashboard from "./Dashboard";
import { TrendPoint } from "./TrendChart";
import { crossSourceGroups, groupStats } from "./lib/enrich/compareStats";
import CalibrationView from "./CalibrationView";
import MatchTicker from "./MatchTicker";
import { Hero } from "./Ambience";

type View = "screener" | "compare" | "calibration";

function formatVolume(n: number, realMoney: boolean): string {
  const prefix = realMoney ? "$" : "Ṁ";
  if (!n) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}


function aggregate(markets: Market[]): TrendPoint {
  const withYes = markets.filter((m) => typeof m.yes === "number" && !isNaN(m.yes));
  const avgYes = withYes.length
    ? Math.round(withYes.reduce((s, m) => s + m.yes, 0) / withYes.length)
    : 0;
  const volume = markets.reduce((s, m) => s + (m.volume || 0), 0);
  return { t: Date.now(), avgYes, volume };
}

export default function ScreenerApp({ markets: initialMarkets }: { markets: Market[] }) {
  const [view, setView] = useState<View>("screener");
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [history, setHistory] = useState<TrendPoint[]>(() => [aggregate(initialMarkets)]);
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());
  const [ago, setAgo] = useState<number>(0);
  const [txlineLoading, setTxlineLoading] = useState<boolean>(true);
  const [txMarkets, setTxMarkets] = useState<Market[]>([]);

  // fetch TxLINE World Cup markets client-side so they never block first paint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/txline", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const tx: Market[] = Array.isArray(data.markets) ? data.markets : [];
        if (!cancelled && tx.length > 0) {
          setTxMarkets(tx); // keep TxLINE in its own state; never wiped by refresh
        }
      } catch {
        // TxLINE unavailable - the rest of the app is unaffected
      } finally {
        if (!cancelled) setTxlineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const REFRESH_MS = 120000; // 2 minutes

  // periodic quiet refresh
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.markets) && data.markets.length > 0) {
          setMarkets(data.markets);
          setUpdatedAt(Date.now());
          setHistory((h) => [...h, aggregate(data.markets)].slice(-120));
        }
      } catch {
        // keep last good data on failure
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // "updated Xs ago" ticker
  useEffect(() => {
    const id = setInterval(() => {
      setAgo(Math.round((Date.now() - updatedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);
  // combine Poly/Manifold (refreshed) with TxLINE (separate, sticky) markets
  const allMarkets = (() => {
    const seen = new Set(markets.map((m) => m.question));
    const extra = txMarkets.filter((m) => !seen.has(m.question));
    return [...markets, ...extra];
  })();
  const groups = view === "compare" ? crossSourceGroups(allMarkets) : [];

  return (
    <div>
      <Hero markets={allMarkets} />
      <MatchTicker markets={allMarkets} loading={txlineLoading} />
      <Dashboard markets={allMarkets} history={history} />
      <CalibrationView compact />
      {/* view toggle */}
      <div className="flex gap-1 mb-4">
        {(["screener", "compare", "calibration"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wide border transition-colors ${
              view === v
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {v === "screener" ? "Screener" : v === "compare" ? "Compare ⇄" : "Calibration"}
          </button>
        ))}
      </div>

      {view === "screener" && (
        <>
          <div className="mb-2 font-mono text-[10px] text-zinc-600 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            auto-refreshes every 2 min &middot; updated {ago === 0 ? "just now" : `${ago}s ago`}
          {txlineLoading && (
            <span className="ml-2 text-emerald-400/70">&middot; loading World Cup markets&hellip;</span>
          )}
          </div>
          <MarketTable markets={allMarkets} />
        </>
      )}

      {view === "compare" && (
        <div>
          <p className="font-mono text-xs text-zinc-500 mb-4 leading-relaxed max-w-2xl">
            Markets that appear to be about the same question on different
            platforms, shown side by side. Matching is automatic and approximate
            — read each market to confirm they truly ask the same thing before
            relying on it. You decide.
          </p>

          {groups.length === 0 ? (
            <p className="text-zinc-600 font-mono text-sm py-8">
              No cross-platform matches found right now. This view gets richer as
              more sources are added.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((g, gi) => (
                <div
                  key={gi}
                  className="rounded-lg border border-zinc-800/80 overflow-hidden"
                >
                  <div className="bg-zinc-900/90 px-4 py-2.5 flex items-start justify-between gap-3">
                    <span className="text-zinc-200 text-sm leading-snug">{g.label}</span>
                    {(() => {
                      const sp = groupStats(g.markets, g.label).divergence?.spreadPts ?? 0;
                      if (sp >= 5) {
                        const strong = sp >= 12;
                        return (
                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-wide border ${
                              strong
                                ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            }`}
                            title="Observable gap between sources on the same market. Not a prediction or advice."
                          >
                            ⇄ {sp} pt gap
                          </span>
                        );
                      }
                      return (
                        <span className="shrink-0 inline-flex items-center rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-wide border border-zinc-700 bg-zinc-800/40 text-zinc-500">
                          aligned
                        </span>
                      );
                    })()}
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {g.markets.map((m, mi) => (
                      <div
                        key={mi}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                              m.realMoney
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-700/40 text-zinc-500"
                            }`}
                          >
                            {m.source === "Polymarket" ? "POLY" : m.source === "Manifold" ? "MANI" : "TXWC"}
                          </span>
                          <span className="font-mono text-xs text-zinc-500">
                            {m.realMoney ? "real" : "play"}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 font-mono text-xs">
                          <span className="text-zinc-500">
                            Yes{" "}
                            <span className="text-emerald-300 tabular-nums">
                              {m.yes < 0 ? "—" : `${m.yes}%`}
                            </span>
                          </span>
                          <span className="text-zinc-500 tabular-nums w-16 text-right">
                            {formatVolume(m.volume, m.realMoney)}
                          </span>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          >
                            view ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* divergence + consensus across the matched sources */}
                  {(() => {
                    const stats = groupStats(g.markets, g.label);
                    const div = stats.divergence;
                    const con = stats.consensus;
                    if (!con) return null;
                    return (
                      <div className="bg-zinc-950/60 px-4 py-2.5 font-mono text-xs space-y-1.5">
                        {div && (
                          <div>
                            {div.spreadPts > 0 ? (
                              <span className="text-zinc-400">
                                Sources disagree by{" "}
                                <span className="text-emerald-300">{div.spreadPts} pts</span>
                              </span>
                            ) : (
                              <span className="text-zinc-500">Sources agree</span>
                            )}
                          </div>
                        )}
                        <div className="text-zinc-500">
                          Blended estimate{" "}
                          <span className="text-emerald-300">{con.probabilityPct}%</span>
                          <span className="text-zinc-600">
                            {" "}(likely {con.bandPct[0]} to {con.bandPct[1]}%)
                          </span>
                        </div>
                        <div className="text-zinc-700 text-[10px]">
                          Weighted by liquidity
                          {stats.hasPlayMoney ? ", play-money down-weighted" : ""}. Not advice.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "calibration" && (
        <div>
          <CalibrationView />
        </div>
      )}
    </div>
  );
}
