// app/MarketTable.tsx
// Signal402 - dexscreener-vibe screener table
// Build 10: category chips + filter, and an intelligence panel in the expanded row

"use client";

import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { signalScore, BAND_COLOR, buildDisagreementIndex } from "./lib/signalScore";
import { Market } from "./types";
import Copilot from "./Copilot";
import PriceChart from "./PriceChart";
import EventContext from "./EventContext";
import ProofReceipt from "./ProofReceipt";
import Replay from "./Replay";
import Investigate from "./Investigate";
import IntelPanel from "./IntelPanel";
import SideSplit from "./SideSplit";
import MarketThumb from "./MarketThumb";
import { categoriesForMarket } from "./lib/enrich/adapt";
import type { CategoryId } from "./lib/enrich/types";

type SourceFilter = "all" | "Polymarket" | "Manifold" | "TxLINE";
type SortKey = "volume" | "yes" | "move" | "signal";
type CatFilter = CategoryId | "all";

function formatVolume(n: number, realMoney: boolean): string {
  const prefix = realMoney ? "$" : "Ṁ";
  if (!n) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function moveCell(move: number | null): { text: string; className: string } {
  if (move === null) return { text: "—", className: "text-zinc-600" };
  if (move > 0) return { text: `▲${move}`, className: "text-emerald-400" };
  if (move < 0) return { text: `▼${Math.abs(move)}`, className: "text-rose-400" };
  return { text: "0", className: "text-zinc-500" };
}

function ProbBar({ yes }: { yes: number }) {
  if (yes < 0) {
    return <span className="text-zinc-600 font-mono text-xs">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${Math.max(3, yes)}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-emerald-300 w-9 text-right">
        {yes}%
      </span>
    </div>
  );
}

export default function MarketTable({ markets }: { markets: Market[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState<CatFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Event-driven row glow: remember each market's last-seen yes / volume / signal
  // band, and when a refresh changes one past a threshold, glow that row once.
  // First load seeds the map without glowing anything.
  const prevRef = useRef<Map<string, { yes: number; vol: number; band: string }>>(
    new Map()
  );
  const seededRef = useRef(false);
  const [glowing, setGlowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevRef.current;
    const changed: string[] = [];
    for (const m of markets) {
      const sig = signalScore(m, markets, disagreementIndex);
      const key = m.question;
      const before = prev.get(key);
      if (before) {
        const yesMoved =
          m.yes >= 0 && before.yes >= 0 && Math.abs(m.yes - before.yes) >= 2;
        const volSpiked =
          before.vol > 0 && m.volume > before.vol * 1.25 && m.volume - before.vol > 1000;
        const bandChanged = sig.band !== before.band;
        if (yesMoved || volSpiked || bandChanged) changed.push(key);
      }
      prev.set(key, { yes: m.yes, vol: m.volume, band: sig.band });
    }
    // do not glow anything on the very first population
    if (!seededRef.current) {
      seededRef.current = true;
      return;
    }
    if (changed.length === 0) return;
    setGlowing(new Set(changed));
    const t = setTimeout(() => setGlowing(new Set()), 1300);
    return () => clearTimeout(t);
  }, [markets]);


  // categorize once per market list
  const disagreementIndex = useMemo(() => buildDisagreementIndex(markets), [markets]);
  const enriched = useMemo(
    () => markets.map((m) => ({ m, cats: categoriesForMarket(m), sig: signalScore(m, markets, disagreementIndex) })),
    [markets, disagreementIndex]
  );

  // categories present in the current source view, with counts, biggest first
  const catCounts = useMemo(() => {
    const base = source === "all" ? enriched : enriched.filter((x) => x.m.source === source);
    const counts = new Map<CategoryId, { label: string; n: number }>();
    for (const x of base)
      for (const c of x.cats) {
        const cur = counts.get(c.id);
        counts.set(c.id, { label: c.label, n: (cur?.n ?? 0) + 1 });
      }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [enriched, source]);

  const rows = useMemo(() => {
    let r = enriched;
    if (source !== "all") r = r.filter((x) => x.m.source === source);
    if (category !== "all") r = r.filter((x) => x.cats.some((c) => c.id === category));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((x) => x.m.question.toLowerCase().includes(q));
    }
    const sorted = [...r].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "yes") {
        av = a.m.yes;
        bv = b.m.yes;
      } else if (sortKey === "move") {
        av = a.m.move ?? -9999;
        bv = b.m.move ?? -9999;
      } else if (sortKey === "signal") {
        av = a.sig.score;
        bv = b.sig.score;
      } else {
        av = a.m.volume;
        bv = b.m.volume;
      }
      return sortDesc ? bv - av : av - bv;
    });
    return sorted;
  }, [enriched, source, category, query, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
    setExpanded(null);
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDesc ? " ↓" : " ↑") : "";

  const tabs: SourceFilter[] = ["all", "Polymarket", "Manifold", "TxLINE"];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setExpanded(null);
          }}
          placeholder="Search markets…  e.g. world cup, election, bitcoin"
          className="flex-1 px-3 py-2 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-emerald-500/60"
        />
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSource(t);
                setCategory("all");
                setExpanded(null);
              }}
              className={`px-3 py-2 rounded text-xs font-mono uppercase tracking-wide border transition-colors ${
                source === t
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "all" ? "all" : t}
            </button>
          ))}
        </div>
      </div>

      {/* category filter */}
      {catCounts.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => {
              setCategory("all");
              setExpanded(null);
            }}
            className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wide border transition-colors ${
              category === "all"
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            all categories
          </button>
          {catCounts.map(([id, { label, n }]) => (
            <button
              key={id}
              onClick={() => {
                setCategory(id);
                setExpanded(null);
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wide border transition-colors ${
                category === id
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label} <span className="text-zinc-600">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-xs text-zinc-500">
          {rows.length} markets live
          {query.trim() ? ` · "${query.trim()}"` : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-zinc-600 font-mono text-sm px-1 py-8">
          No markets match. Clear the search or switch source.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
          <style dangerouslySetInnerHTML={{ __html: `
@keyframes s402rowglow{0%{background-color:rgba(52,211,153,.30);box-shadow:inset 0 0 0 1px rgba(52,211,153,.45)}70%{background-color:rgba(52,211,153,.12)}100%{background-color:transparent;box-shadow:none}}
@media (prefers-reduced-motion: reduce){.s402rowglow{animation:none!important}}
` }} />
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                <th className="px-3 py-2.5 font-medium">Market</th>
                <th
                  className="px-3 py-2.5 font-medium cursor-pointer hover:text-emerald-300 select-none"
                  onClick={() => toggleSort("signal")}
                  title="Signal Score: observable market activity. Not a prediction or advice."
                >
                  Signal{sortArrow("signal")}
                </th>
                <th className="px-3 py-2.5 font-medium">Src</th>
                <th
                  className="px-3 py-2.5 font-medium cursor-pointer hover:text-emerald-300 select-none"
                  onClick={() => toggleSort("yes")}
                >
                  Crowd{sortArrow("yes")}
                </th>
                <th
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-emerald-300 select-none"
                  onClick={() => toggleSort("move")}
                >
                  24h{sortArrow("move")}
                </th>
                <th
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-emerald-300 select-none"
                  onClick={() => toggleSort("volume")}
                >
                  Vol{sortArrow("volume")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, cats, sig }, i) => {
                const mv = moveCell(m.move);
                const isOpen = expanded === i;
                return (
                  <Fragment key={i}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className={`border-t border-zinc-800/60 cursor-pointer transition-colors ${
                        isOpen ? "bg-zinc-900/80" : "hover:bg-zinc-900/60"
                      } ${glowing.has(m.question) ? "s402rowglow" : ""}`}
                      style={
                        glowing.has(m.question)
                          ? { animation: "s402rowglow 1.4s ease-out" }
                          : undefined
                      }
                    >
                      <td className="px-3 py-2 max-w-md text-zinc-200 leading-snug">
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-600 font-mono text-xs mt-1">
                            {isOpen ? "▾" : "▸"}
                          </span>
                          <span className="mt-0.5">
                            <MarketThumb market={m} />
                          </span>
                          <div>
                            {m.question}
                            {cats.length > 0 && (
                              <span className="flex items-center gap-1 flex-wrap mt-1">
                                {cats.slice(0, 3).map((c) => (
                                  <span
                                    key={c.id}
                                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-zinc-800/70 text-zinc-400"
                                  >
                                    {c.label}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1.5"
                          title={`Signal ${sig.score}/100 · ${sig.label}${sig.reasons.length ? " · " + sig.reasons.join(", ") : ""}. Observable activity, not a prediction or advice.`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: BAND_COLOR[sig.band] }}
                          />
                          <span className="font-mono text-xs tabular-nums text-zinc-300">
                            {sig.score}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                            m.realMoney
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-zinc-700/40 text-zinc-500"
                          }`}
                        >
                          {m.source === "Polymarket" ? "POLY" : m.source === "Manifold" ? "MANI" : "TXWC"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <ProbBar yes={m.yes} />
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${mv.className}`}
                      >
                        {mv.text}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-zinc-300">
                        {formatVolume(m.volume, m.realMoney)}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-zinc-900/40">
                        <td colSpan={5} className="px-3 pb-4 pt-1">
                          <div className="border-l-2 border-emerald-500/40 pl-4 ml-1">
                            <div className="flex gap-6 mb-3 font-mono text-xs flex-wrap">
                              <span className="text-zinc-500">
                                Yes{" "}
                                <span className="text-emerald-300">
                                  {m.yes < 0 ? "—" : `${m.yes}%`}
                                </span>
                              </span>
                              <span className="text-zinc-500">
                                No{" "}
                                <span className="text-zinc-300">
                                  {m.no < 0 ? "—" : `${m.no}%`}
                                </span>
                              </span>
                              {m.closeDate && (
                                <span className="text-zinc-500">
                                  Closes{" "}
                                  <span className="text-zinc-300">
                                    {m.closeDate}
                                  </span>
                                </span>
                              )}
                              {m.liquidity > 0 && (
                                <span className="text-zinc-500">
                                  Liquidity{" "}
                                  <span className="text-zinc-300">
                                    {formatVolume(m.liquidity, m.realMoney)}
                                  </span>
                                </span>
                              )}
                            </div>

                            <IntelPanel market={m} />

                            <SideSplit market={m} />

                            <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl mb-3 mt-3">
                              {m.description
                                ? m.description.length > 400
                                  ? m.description.slice(0, 400) + "…"
                                  : m.description
                                : "No description provided for this market."}
                            </p>

                            {m.url && (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block font-mono text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                            >
                              View on {m.source} ↗
                            </a>
                              )}
                            <EventContext market={m} />
                            {m.source === "TxLINE" && (
                              <ProofReceipt fixtureId={m.fixtureId} />
                            )}
                            {m.source === "Polymarket" && m.clobTokenId && (
                              <PriceChart tokenId={m.clobTokenId} />
                            )}
                            <Replay market={m} />
                            <Investigate market={m} peers={markets} />
                            <Replay market={m} />
                            <Copilot market={m} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
