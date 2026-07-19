// app/IntelPanel.tsx
// Display-only research panel shown inside an expanded market row.
// Payoff math, a trust score, and resolution transparency. No advice, ever.

import { Market } from "./types";
import { marketToNormalized } from "./lib/enrich/adapt";
import { computePayoff } from "./lib/enrich/payoff";
import { trustScore } from "./lib/enrich/trust";
import { resolutionInfo } from "./lib/enrich/resolution";

function money(n: number, realMoney: boolean): string {
  const p = realMoney ? "$" : "Ṁ";
  return `${p}${Math.round(n)}`;
}

function SideBox({
  label,
  pricePct,
  toWin,
  returnPct,
  realMoney,
}: {
  label: string;
  pricePct: number;
  toWin: number;
  returnPct: number;
  realMoney: boolean;
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {label} · {pricePct}%
      </div>
      <div className="font-mono text-xs text-zinc-300 mt-1">
        risk {money(100, realMoney)} to win{" "}
        <span className="text-emerald-300">{money(toWin, realMoney)}</span>
      </div>
      <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
        correct <span className="text-emerald-400">+{returnPct}%</span> · wrong{" "}
        <span className="text-rose-400">−100%</span>
      </div>
    </div>
  );
}

export default function IntelPanel({ market }: { market: Market }) {
  const n = marketToNormalized(market);
  const known = market.yes >= 0;
  const isTxline = market.source === "TxLINE";

  const trust = trustScore({
    source: n.source,
    volume: market.volume || undefined,
    liquidity: market.liquidity || undefined,
  });
  const trustColor =
    trust.band === "high"
      ? "text-emerald-400 border-emerald-500/40"
      : trust.band === "medium"
        ? "text-emerald-300 border-emerald-500/40"
        : "text-rose-400 border-rose-500/40";

  const res = resolutionInfo({ source: n.source, description: market.description });

  const payoff = known ? computePayoff(n) : null;

  return (
    <div className="mt-3 space-y-3">
      {/* Payoff: tradeable venues only. TxLINE is an odds feed, not a place to stake. */}
      {payoff && !isTxline && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">
            What each side pays · per {money(100, market.realMoney)} staked
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-lg">
            <SideBox
              label="Yes"
              pricePct={Math.round(payoff.yes.price * 100)}
              toWin={payoff.yes.toWin}
              returnPct={payoff.yes.ifRightReturnPct}
              realMoney={market.realMoney}
            />
            <SideBox
              label="No"
              pricePct={Math.round(payoff.no.price * 100)}
              toWin={payoff.no.toWin}
              returnPct={payoff.no.ifRightReturnPct}
              realMoney={market.realMoney}
            />
          </div>
          <p className="font-mono text-[10px] text-zinc-600 mt-1">
            The price is the break-even probability. Figures are arithmetic, not advice.
          </p>
        </div>
      )}

      {isTxline && known && (
        <div className="font-mono text-xs text-zinc-500">
          Demargined consensus:{" "}
          <span className="text-emerald-300">{market.yes}%</span> implied. Odds feed, no
          participant pool, nothing to stake here.
        </div>
      )}

      {/* Trust score + resolution, side by side on wide screens */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            Trust score
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`font-mono text-lg ${trustColor.split(" ")[0]}`}>{trust.score}</span>
            <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border ${trustColor}`}>
              {trust.band}
            </span>
          </div>
          <div className="font-mono text-[10px] text-zinc-600 mt-1 max-w-xs leading-relaxed">
            {trust.factors.map((f) => f.note).join(" · ")}
          </div>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 max-w-md">
          <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            How it resolves
          </div>
          <div className="font-mono text-xs text-zinc-300 mt-1">
            {res.resolver}{" "}
            <span
              className={`text-[10px] ${res.verifiable ? "text-emerald-400" : "text-zinc-500"}`}
            >
              {res.verifiable ? "· verifiable" : "· trust-based"}
            </span>
          </div>
          {res.criteria && (
            <p className="font-mono text-[10px] text-zinc-500 mt-1 leading-relaxed">
              {res.criteria.length > 160 ? res.criteria.slice(0, 160) + "…" : res.criteria}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
