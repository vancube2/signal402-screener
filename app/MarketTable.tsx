// app/MarketTable.tsx
// Signal402 - dexscreener-vibe screener table
// Build 8.1: expandable row detail (fragment key fixed)

"use client";

import { useState, useMemo, Fragment } from "react";
import { Market } from "./types";
import Copilot from "./Copilot";

type SourceFilter = "all" | "Polymarket" | "Manifold";
type SortKey = "volume" | "yes" | "move";

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
          className="h-full rounded-full bg-amber-400"
          style={{ width: `${Math.max(3, yes)}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-amber-300 w-9 text-right">
        {yes}%
      </span>
    </div>
  );
}

export default function MarketTable({ markets }: { markets: Market[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const rows = useMemo(() => {
    let r = markets;
    if (source !== "all") r = r.filter((m) => m.source === source);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((m) => m.question.toLowerCase().includes(q));
    }
    const sorted = [...r].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "yes") {
        av = a.yes;
        bv = b.yes;
      } else if (sortKey === "move") {
        av = a.move ?? -9999;
        bv = b.move ?? -9999;
      } else {
        av = a.volume;
        bv = b.volume;
      }
      return sortDesc ? bv - av : av - bv;
    });
    return sorted;
  }, [markets, source, query, sortKey, sortDesc]);

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

  const tabs: SourceFilter[] = ["all", "Polymarket", "Manifold"];

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
          className="flex-1 px-3 py-2 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:border-amber-500/60"
        />
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSource(t);
                setExpanded(null);
              }}
              className={`px-3 py-2 rounded text-xs font-mono uppercase tracking-wide border transition-colors ${
                source === t
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "all" ? "all" : t}
            </button>
          ))}
        </div>
      </div>

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
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-500 font-mono text-xs uppercase tracking-wider">
                <th className="px-3 py-2.5 font-medium">Market</th>
                <th className="px-3 py-2.5 font-medium">Src</th>
                <th
                  className="px-3 py-2.5 font-medium cursor-pointer hover:text-amber-300 select-none"
                  onClick={() => toggleSort("yes")}
                >
                  Crowd{sortArrow("yes")}
                </th>
                <th
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-amber-300 select-none"
                  onClick={() => toggleSort("move")}
                >
                  24h{sortArrow("move")}
                </th>
                <th
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-amber-300 select-none"
                  onClick={() => toggleSort("volume")}
                >
                  Vol{sortArrow("volume")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const mv = moveCell(m.move);
                const isOpen = expanded === i;
                return (
                  <Fragment key={i}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className={`border-t border-zinc-800/60 cursor-pointer transition-colors ${
                        isOpen ? "bg-zinc-900/80" : "hover:bg-zinc-900/60"
                      }`}
                    >
                      <td className="px-3 py-2 max-w-md text-zinc-200 leading-snug">
                        <span className="text-zinc-600 mr-1.5 font-mono text-xs">
                          {isOpen ? "▾" : "▸"}
                        </span>
                        {m.question}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                            m.realMoney
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-zinc-700/40 text-zinc-500"
                          }`}
                        >
                          {m.source === "Polymarket" ? "POLY" : "MANI"}
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
                          <div className="border-l-2 border-amber-500/40 pl-4 ml-1">
                            <div className="flex gap-6 mb-3 font-mono text-xs flex-wrap">
                              <span className="text-zinc-500">
                                Yes{" "}
                                <span className="text-amber-300">
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
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl mb-3">
                              {m.description
                                ? m.description.length > 400
                                  ? m.description.slice(0, 400) + "…"
                                  : m.description
                                : "No description provided for this market."}
                            </p>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block font-mono text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                            >
                              View on {m.source} ↗
                            </a>
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
