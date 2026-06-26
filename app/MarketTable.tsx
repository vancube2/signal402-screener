// app/MarketTable.tsx
// Client component: search + source filter + table with Source column

"use client";

import { useState } from "react";
import { Market } from "./types";

function formatVolume(n: number, realMoney: boolean): string {
  const prefix = realMoney ? "$" : "M";
  if (!n) return "-";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function yesText(yes: number): string {
  return yes < 0 ? "-" : `${yes}%`;
}

function moveCell(move: number | null): { text: string; className: string } {
  if (move === null) return { text: "-", className: "text-neutral-600" };
  if (move > 0) return { text: `+${move}`, className: "text-emerald-400" };
  if (move < 0) return { text: `${move}`, className: "text-rose-400" };
  return { text: "0", className: "text-neutral-500" };
}

type SourceFilter = "all" | "Polymarket" | "Manifold";

export default function MarketTable({ markets }: { markets: Market[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  let filtered = markets;
  if (source !== "all") filtered = filtered.filter((m) => m.source === source);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter((m) => m.question.toLowerCase().includes(q));
  }

  const tabs: SourceFilter[] = ["all", "Polymarket", "Manifold"];

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search markets (e.g. world cup, election, bitcoin)"
        className="w-full mb-4 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50"
      />

      <div className="flex gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setSource(t)}
            className={`px-3 py-1 rounded-md text-sm border ${
              source === t
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t === "all" ? "All sources" : t}
          </button>
        ))}
      </div>

      <p className="text-xs text-neutral-500 mb-3">
        {filtered.length} {filtered.length === 1 ? "market" : "markets"}
        {query.trim() ? ` matching "${query.trim()}"` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-neutral-500">No markets match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Market</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Yes</th>
                <th className="px-4 py-3 font-medium text-right">24h</th>
                <th className="px-4 py-3 font-medium text-right">Volume</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const mv = moveCell(m.move);
                return (
                  <tr
                    key={i}
                    className="border-t border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3 max-w-lg">{m.question}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          m.realMoney
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-neutral-700/40 text-neutral-400"
                        }`}
                      >
                        {m.source}
                        {!m.realMoney ? " (play)" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-400">
                      {yesText(m.yes)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${mv.className}`}
                    >
                      {mv.text}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                      {formatVolume(m.volume, m.realMoney)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
