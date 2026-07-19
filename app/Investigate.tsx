// app/Investigate.tsx
// Investigation Mode: an analyst view of a market. It gathers only real,
// observable facts, the probability change over the recent window (from the
// history route), current volume, whether an on-chain proof is available, and any
// cross-market gap, then asks the grounded copilot route to EXPLAIN what changed.
// It never recommends a position. It answers "why did this move and how reliable
// is the evidence," not "what should I bet."

"use client";

import { useState } from "react";
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

type Change = {
  from: number;
  to: number;
  delta: number;
  points: number;
  windowLabel: string;
};

function computeChange(series: Point[]): Change | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const ms = last.t - first.t;
  const hours = ms / 3600000;
  const windowLabel =
    hours >= 48
      ? `${Math.round(hours / 24)} days`
      : hours >= 2
      ? `${Math.round(hours)} hours`
      : `${Math.round(hours * 60)} minutes`;
  return {
    from: first.yes,
    to: last.yes,
    delta: last.yes - first.yes,
    points: series.length,
    windowLabel,
  };
}

export default function Investigate({
  market,
  peers,
}: {
  market: Market;
  peers?: Market[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [change, setChange] = useState<Change | null>(null);
  const [analysis, setAnalysis] = useState("");

  // find a cross-market peer (same question, different source) for comparison
  const peer =
    peers && market.yes >= 0
      ? peers.find(
          (x) =>
            x !== market &&
            x.source !== market.source &&
            x.yes >= 0 &&
            norm(x.question) === norm(market.question)
        )
      : undefined;

  async function runInvestigation() {
    setLoading(true);
    setErr("");
    setAnalysis("");
    setOpen(true);
    try {
      // 1. pull the real history and compute the actual change
      let ch: Change | null = null;
      const url = historyUrl(market);
      if (url) {
        const res = await fetch(url);
        const d = await res.json();
        const series: Point[] = Array.isArray(d.series) ? d.series : [];
        ch = computeChange(series);
      }
      setChange(ch);

      // 2. assemble ONLY real facts into a context for the grounded route
      const facts: string[] = [
        `Question: ${market.question}`,
        `Source: ${market.source} (${market.realMoney ? "real money" : "play money"})`,
        market.yes >= 0 ? `Current implied probability: ${market.yes}%` : "",
        ch
          ? `Observed change: moved from ${ch.from}% to ${ch.to}% (${
              ch.delta > 0 ? "+" : ""
            }${ch.delta} points) over the last ${ch.windowLabel}, across ${ch.points} recorded points.`
          : "No recent price history available.",
        market.volume
          ? `Current total volume: ${market.realMoney ? "$" : ""}${Math.round(
              market.volume
            )}.`
          : "",
        market.liquidity
          ? `Current liquidity: ${market.realMoney ? "$" : ""}${Math.round(
              market.liquidity
            )}.`
          : "",
        market.source === "TxLINE"
          ? "This market has an on-chain Merkle proof available (verifiable resolution)."
          : "",
        peer
          ? `Cross-market comparison: ${peer.source} implies ${peer.yes}% for the same question, a ${Math.abs(
              peer.yes - market.yes
            )} point gap.`
          : "",
      ].filter(Boolean);

      const context = facts.join("\n");
      const userMessage =
        "Act as a market analyst. Using ONLY the observable facts above, explain what changed in this market and what it plausibly reflects (for example reaction to new information, thin trading, or shifting consensus). Be concise and factual. State clearly if the evidence is limited. Do NOT recommend any position, bet, or action. Explain, do not advise.";

      // 3. reuse the grounded explain route (holds the key + never-tip prompt)
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: context, userMessage }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error || "Investigation failed.");
      else setAnalysis(data.answer || "No analysis returned.");
    } catch {
      setErr("Could not run the investigation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-emerald-800/40 bg-emerald-950/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
          Investigation
        </span>
        {!open && (
          <button
            onClick={runInvestigation}
            className="font-mono text-[10px] rounded border border-emerald-700/50 bg-emerald-500/10 px-2 py-1 text-emerald-300 hover:bg-emerald-500/20"
          >
            Investigate this market
          </button>
        )}
      </div>

      {err && <div className="mt-2 font-mono text-[10px] text-rose-400/80">{err}</div>}

      {open && (
        <div className="mt-3 space-y-3">
          {/* Section 1: what changed (real numbers) */}
          <div className="rounded bg-zinc-950/50 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">
              What changed
            </div>
            {change ? (
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-zinc-400">
                  {change.from}% <span className="text-zinc-600">→</span>{" "}
                  <span className="text-zinc-200">{change.to}%</span>
                </span>
                <span
                  className={
                    change.delta > 0
                      ? "text-emerald-400"
                      : change.delta < 0
                      ? "text-rose-400"
                      : "text-zinc-500"
                  }
                >
                  {change.delta > 0 ? "+" : ""}
                  {change.delta} pts
                </span>
                <span className="text-zinc-600">over {change.windowLabel}</span>
              </div>
            ) : (
              <div className="font-mono text-[10px] text-zinc-500">
                {loading ? "gathering history…" : "No recent history available."}
              </div>
            )}
          </div>

          {/* Section 2: verified events / evidence */}
          <div className="rounded bg-zinc-950/50 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">
              Evidence
            </div>
            <div className="space-y-1 font-mono text-[10px] text-zinc-400">
              <div>
                Source:{" "}
                <span className="text-zinc-200">
                  {market.source} ({market.realMoney ? "real money" : "play money"})
                </span>
              </div>
              {market.source === "TxLINE" && (
                <div className="text-emerald-300/80">
                  On-chain Merkle proof available for this market.
                </div>
              )}
              {peer && (
                <div>
                  Cross-market:{" "}
                  <span className="text-zinc-200">
                    {peer.source} {peer.yes}%
                  </span>{" "}
                  vs {market.source} {market.yes}% (
                  {Math.abs(peer.yes - market.yes)} pt gap)
                </div>
              )}
            </div>
          </div>

          {/* Section 3: grounded analysis */}
          <div className="rounded bg-zinc-950/50 p-2.5">
            <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">
              Analysis
            </div>
            {loading ? (
              <div className="flex flex-col gap-1.5 max-w-[220px]">
                <span className="h-1.5 rounded-full bg-emerald-400/40 animate-pulse" style={{ width: "100%" }} />
                <span className="h-1.5 rounded-full bg-emerald-400/40 animate-pulse" style={{ width: "72%" }} />
                <span className="h-1.5 rounded-full bg-emerald-400/40 animate-pulse" style={{ width: "88%" }} />
              </div>
            ) : analysis ? (
              <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </div>
            ) : null}
          </div>

          <div className="font-mono text-[9px] text-zinc-600">
            Investigation explains observable activity from real data. It is not a
            prediction and not advice.
          </div>
        </div>
      )}
    </div>
  );
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}
