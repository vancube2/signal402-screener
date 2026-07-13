// app/SideSplit.tsx
// Money/holders on each side of a market. Display-only, no advice.
//   Manifold: current stake per side from the positions endpoint (play money).
//   Polymarket: top-holder lean per side from the public Data API (real money, top 20/side).
//   TxLINE: odds feed, nothing staked.

"use client";

import { useEffect, useState } from "react";
import { Market } from "./types";

interface Split {
  available: boolean;
  // manifold stake (mana)
  yes?: number;
  no?: number;
  holders?: number;
  // polymarket top holders (shares)
  partial?: boolean;
  yesShares?: number;
  noShares?: number;
  yesCount?: number;
  noCount?: number;
}

function compact(n: number, prefix = ""): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

function Bar({ yesPct }: { yesPct: number }) {
  return (
    <div className="flex h-2.5 w-full max-w-lg rounded-full overflow-hidden bg-zinc-800">
      <div className="h-full bg-emerald-500/80" style={{ width: `${yesPct}%` }} />
      <div className="h-full bg-rose-500/70" style={{ width: `${100 - yesPct}%` }} />
    </div>
  );
}

export default function SideSplit({ market }: { market: Market }) {
  const isManifold = market.source === "Manifold" && !!market.marketId;
  const isPoly = market.source === "Polymarket" && !!market.conditionId;
  const willFetch = isManifold || isPoly;

  const [data, setData] = useState<Split | null>(null);
  const [loading, setLoading] = useState(willFetch);

  useEffect(() => {
    if (!willFetch) return;
    let alive = true;
    const url = isManifold
      ? `/api/manifold-split?id=${encodeURIComponent(market.marketId as string)}`
      : `/api/polymarket-holders?cid=${encodeURIComponent(
          market.conditionId as string
        )}&yes=${encodeURIComponent(market.clobTokenId ?? "")}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: Split) => {
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
  }, [willFetch, isManifold, market.marketId, market.conditionId, market.clobTokenId]);

  const heading = (label: string) => (
    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">
      {label}
    </div>
  );

  if (market.source === "TxLINE") {
    return (
      <div className="mt-3">
        {heading("Money on each side now")}
        <p className="font-mono text-xs text-zinc-500">
          Odds feed, no participant pool. Nothing is staked here.
        </p>
      </div>
    );
  }

  if (!willFetch) return null;

  if (loading || !data) {
    return (
      <div className="mt-3">
        {heading(isPoly ? "Top holders on each side" : "Money on each side now")}
        <p className="font-mono text-xs text-zinc-600">Loading…</p>
      </div>
    );
  }

  // Manifold: current stake in mana
  if (isManifold) {
    if (!data.available || data.yes === undefined || data.no === undefined) {
      return (
        <div className="mt-3">
          {heading("Money on each side now")}
          <p className="font-mono text-xs text-zinc-600">No holder data available.</p>
        </div>
      );
    }
    const total = data.yes + data.no;
    const yesPct = total > 0 ? Math.round((data.yes / total) * 100) : 0;
    return (
      <div className="mt-3">
        {heading("Money on each side now")}
        <Bar yesPct={yesPct} />
        <div className="flex justify-between max-w-lg mt-1 font-mono text-xs">
          <span className="text-emerald-400">
            {compact(data.yes, "Ṁ")} on Yes <span className="text-zinc-600">({yesPct}%)</span>
          </span>
          <span className="text-rose-400">
            <span className="text-zinc-600">({100 - yesPct}%)</span> {compact(data.no, "Ṁ")} on No
          </span>
        </div>
        <p className="font-mono text-[10px] text-zinc-600 mt-1">
          Play money, from {data.holders} holders. Stake, not lifetime volume.
        </p>
      </div>
    );
  }

  // Polymarket: top-holder lean in shares
  if (!data.available || data.yesShares === undefined || data.noShares === undefined) {
    return (
      <div className="mt-3">
        {heading("Top holders on each side")}
        <p className="font-mono text-xs text-zinc-600">No holder data available.</p>
      </div>
    );
  }
  const total = data.yesShares + data.noShares;
  const yesPct = total > 0 ? Math.round((data.yesShares / total) * 100) : 0;
  return (
    <div className="mt-3">
      {heading("Top holders on each side")}
      <Bar yesPct={yesPct} />
      <div className="flex justify-between max-w-lg mt-1 font-mono text-xs">
        <span className="text-emerald-400">
          {compact(data.yesShares)} sh Yes <span className="text-zinc-600">({yesPct}%)</span>
        </span>
        <span className="text-rose-400">
          <span className="text-zinc-600">({100 - yesPct}%)</span> {compact(data.noShares)} sh No
        </span>
      </div>
      <p className="font-mono text-[10px] text-zinc-600 mt-1">
        Real money, top {(data.yesCount ?? 0) + (data.noCount ?? 0)} holders (up to 20/side). Full
        totals need the on-chain reader.
      </p>
    </div>
  );
}
