// app/EventContext.tsx
// Neutral event-context field for the expanded row. Derives real-world status
// from data we already have (close/end date). No urgency, no "act now" - just
// context, the same category as liquidity or close date.
// Extensible: if a live score is ever attached to a market, show it here.

"use client";

import { Market } from "./types";

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function EventContext({ market }: { market: Market }) {
  // closeDate on the Market is a human string like "Jul 20, 2026" which
  // new Date() parses fine. That's the only date field we carry.
  const days = daysUntil(market.closeDate);

  let status: string;
  let tone: string; // tailwind text color

  if (days === null) {
    status = "No resolution date available";
    tone = "text-zinc-600";
  } else if (days < 0) {
    status = "Market has closed";
    tone = "text-zinc-500";
  } else if (days === 0) {
    status = "Resolves today";
    tone = "text-amber-400";
  } else if (days <= 7) {
    status = `Resolves in ${days} day${days === 1 ? "" : "s"}`;
    tone = "text-amber-400/90";
  } else if (days <= 60) {
    status = `Resolves in about ${Math.round(days / 7)} weeks`;
    tone = "text-zinc-400";
  } else {
    status = `Resolves in about ${Math.round(days / 30)} months`;
    tone = "text-zinc-500";
  }

  return (
    <div className="mt-3 flex items-center gap-2 font-mono text-[11px]">
      <span className="uppercase tracking-wider text-zinc-600">event</span>
      <span className={tone}>{status}</span>
      {market.closeDate && (
        <span className="text-zinc-600">· {market.closeDate}</span>
      )}
    </div>
  );
}
