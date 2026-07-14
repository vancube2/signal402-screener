// app/MarketThumb.tsx
// Small per-market thumbnail, left of the market name.
//   Sports fixtures -> the teams' flags (flagcdn).
//   Single-team outrights -> that team's flag.
//   Everything else -> a deterministic abstract emblem, tinted by category.
// No copyrighted imagery; flags and generated art only.

import { Market } from "./types";
import { flagCode, flagUrl } from "./lib/flags";
import { categoriesForMarket } from "./lib/enrich/adapt";
import type { CategoryId } from "./lib/enrich/types";

function teamsOf(m: Market): string[] | null {
  if (m.source === "TxLINE" && m.home && m.away) return [m.home, m.away];
  const vs = m.question.match(/^(.+?)\s+(?:vs\.?|v\.?)\s+(.+?)\??$/i);
  if (vs) return [vs[1].trim(), vs[2].trim()];
  const out = m.question.match(/^will\s+(.+?)\s+win\b/i);
  if (out) return [out[1].trim()];
  return null;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CAT_HUE: Record<CategoryId, number> = {
  politics: 275,
  crypto: 40,
  economy: 152,
  weather: 200,
  culture: 320,
  science_tech: 190,
  business: 222,
  sports: 14,
  world: 258,
};

function Abstract({ market }: { market: Market }) {
  const cats = categoriesForMarket(market);
  const cat = (cats[0]?.id ?? "world") as CategoryId;
  const base = CAT_HUE[cat] ?? 258;
  const h = hash(market.question);
  const hue2 = (base + 30 + (h % 40)) % 360;
  const cx = 8 + (h % 12);
  const cy = 8 + ((h >> 3) % 12);
  const r = 5 + (h % 5);
  const id = `g${h % 100000}`;
  return (
    <svg width={26} height={26} viewBox="0 0 26 26" className="rounded-md shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${base} 55% 32%)`} />
          <stop offset="100%" stopColor={`hsl(${hue2} 60% 20%)`} />
        </linearGradient>
      </defs>
      <rect width={26} height={26} rx={6} fill={`url(#${id})`} />
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.16)" />
      <circle cx={26 - cx} cy={26 - cy} r={r * 0.6} fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

export default function MarketThumb({ market }: { market: Market }) {
  const teams = teamsOf(market);
  const codes = teams ? teams.map((t) => flagCode(t)) : null;
  const allFlags = !!codes && codes.every(Boolean);

  if (allFlags && codes) {
    if (codes.length >= 2) {
      return (
        <span
          className="inline-flex shrink-0 rounded-md overflow-hidden border border-zinc-700/60"
          style={{ width: 26, height: 20 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(codes[0] as string, "32x24")} alt="" className="w-1/2 h-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(codes[1] as string, "32x24")} alt="" className="w-1/2 h-full object-cover" />
        </span>
      );
    }
    return (
      <span
        className="inline-flex shrink-0 rounded-md overflow-hidden border border-zinc-700/60"
        style={{ width: 26, height: 20 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(codes[0] as string, "32x24")} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return <Abstract market={market} />;
}
