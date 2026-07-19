// app/MatchTicker.tsx
// Auto-scrolling World Cup ticker driven by the real TxLINE feed. Live matches lead,
// then upcoming by kickoff. Flags from flagcdn (free, no key). Display-only, no scores
// are invented; we show teams, status, kickoff, and the demargined home-win chance.

"use client";

import { useMemo, useState } from "react";
import { Market } from "./types";
import { flagCode, flagUrl } from "./lib/flags";

function Flag({ name }: { name: string }) {
  const code = flagCode(name);
  if (!code) return <span className="text-zinc-500">🌐</span>;
  return (
    // plain img avoids next/image domain config
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagUrl(code, "24x18")}
      srcSet={`${flagUrl(code, "48x36")} 2x`}
      width={20}
      height={15}
      alt={name}
      className="inline-block rounded-[2px] border border-zinc-700/60"
    />
  );
}

function kickoff(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MatchTicker({ markets, loading = false }: { markets: Market[]; loading?: boolean }) {
  const [hidden, setHidden] = useState(false);

  const fixtures = useMemo(() => {
    const tx = markets.filter((m) => m.source === "TxLINE" && m.home && m.away);
    return [...tx].sort((a, b) => {
      const al = a.inRunning ? 0 : 1;
      const bl = b.inRunning ? 0 : 1;
      if (al !== bl) return al - bl;
      return (a.startTime ?? 0) - (b.startTime ?? 0);
    });
  }, [markets]);

  if (fixtures.length === 0) {
    if (loading) {
      return (
        <div className="mb-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Loading World Cup matches…
          </span>
        </div>
      );
    }
    return null;
  }

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="mb-4 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-emerald-300"
      >
        ▸ Show World Cup ticker
      </button>
    );
  }

  // duplicate the list so the marquee loops seamlessly
  const loop = [...fixtures, ...fixtures];

  return (
    <div className="relative mb-4 rounded-lg border border-zinc-800/80 bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes s402ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
          .s402-track{animation:s402ticker ${Math.max(24, fixtures.length * 6)}s linear infinite}
          .s402-ticker:hover .s402-track{animation-play-state:paused}`,
        }}
      />
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800/60">
        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
          World Cup 2026 · live board
        </span>
        <button
          onClick={() => setHidden(true)}
          className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300"
          aria-label="Hide ticker"
        >
          hide ✕
        </button>
      </div>

      <div className="s402-ticker py-2">
        <div className="s402-track flex gap-6 w-max whitespace-nowrap">
          {loop.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-mono text-xs">
              {m.inRunning ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              ) : (
                <span className="text-zinc-600 text-[10px]">{kickoff(m.startTime)}</span>
              )}
              <Flag name={m.home as string} />
              <span className="text-zinc-200">{m.home}</span>
              <span className="text-zinc-600">v</span>
              <span className="text-zinc-200">{m.away}</span>
              <Flag name={m.away as string} />
              {m.yes >= 0 && (
                <span className="text-emerald-300">{m.yes}%</span>
              )}
              {m.inRunning && <span className="text-emerald-400 text-[10px]">LIVE</span>}
              <span className="text-zinc-800">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
