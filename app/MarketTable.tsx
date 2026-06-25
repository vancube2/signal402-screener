// app/MarketTable.tsx
// Client component: search box + filtered table

"use client";

import { useState } from "react";

export type Market = {
  question: string;
  yes: number; // -1 if unknown
  move: number | null; // percentage points, null if unknown
  volume: number;
};

function formatVolume(n: number): string {
  if (!n) return "-";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
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

export default function MarketTable({ markets }: { markets: Market[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? markets.filter((m) =>
        m.question.toLowerCase().includes(query.trim().toLowerCase())
      )
    : markets;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search markets (e.g. world cup, election, bitcoin)"
        className="w-full mb-4 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50"
      />

      <p className="text-xs text-neutral-500 mb-3">
        {filtered.length} {filtered.length === 1 ? "market" : "markets"}
        {query.trim() ? ` matching "${query.trim()}"` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-neutral-500">No markets match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Market</th>
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
                    <td className="px-4 py-3 max-w-xl">{m.question}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-400">
                      {yesText(m.yes)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${mv.className}`}
                    >
                      {mv.text}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                      {formatVolume(m.volume)}
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
