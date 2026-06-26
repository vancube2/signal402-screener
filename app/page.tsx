// app/page.tsx
// Signal402 - prediction market screener
// Build 7: dexscreener-vibe redesign (terminal header + dense table)

import MarketTable from "./MarketTable";
import { Market } from "./types";

// ---------- Polymarket ----------
type PolymarketMarket = {
  question: string;
  volume?: string;
  outcomePrices?: string;
  oneDayPriceChange?: number;
};

async function fetchPolyPage(offset: number): Promise<PolymarketMarket[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&offset=${offset}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as PolymarketMarket[]) : [];
  } catch {
    return [];
  }
}

async function getPolymarket(): Promise<Market[]> {
  const pages = await Promise.all([
    fetchPolyPage(0),
    fetchPolyPage(100),
    fetchPolyPage(200),
  ]);
  const all = pages.flat();
  return all.map((m) => {
    let yes = -1;
    if (m.outcomePrices) {
      try {
        const prices = JSON.parse(m.outcomePrices) as string[];
        if (prices.length > 0) yes = Math.round(parseFloat(prices[0]) * 100);
      } catch {
        yes = -1;
      }
    }
    let move: number | null = null;
    if (
      m.oneDayPriceChange !== undefined &&
      m.oneDayPriceChange !== null &&
      !isNaN(m.oneDayPriceChange)
    ) {
      move = Math.round(m.oneDayPriceChange * 100);
    }
    return {
      question: m.question ?? "(untitled)",
      yes,
      move,
      volume: parseFloat(m.volume ?? "0") || 0,
      source: "Polymarket" as const,
      realMoney: true,
    };
  });
}

// ---------- Manifold ----------
type ManifoldMarket = {
  question: string;
  probability?: number;
  volume?: number;
  outcomeType?: string;
  isResolved?: boolean;
};

async function getManifold(): Promise<Market[]> {
  try {
    const res = await fetch(
      "https://api.manifold.markets/v0/markets?limit=200&sort=last-bet-time",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return (data as ManifoldMarket[])
      .filter(
        (m) =>
          m.outcomeType === "BINARY" &&
          !m.isResolved &&
          typeof m.probability === "number"
      )
      .map((m) => ({
        question: m.question ?? "(untitled)",
        yes: Math.round((m.probability ?? 0) * 100),
        move: null,
        volume: m.volume ?? 0,
        source: "Manifold" as const,
        realMoney: false,
      }));
  } catch {
    return [];
  }
}

async function getMarkets(): Promise<Market[]> {
  const [poly, manifold] = await Promise.all([getPolymarket(), getManifold()]);
  const seen = new Set<string>();
  const all = [...poly, ...manifold].filter((m) => {
    if (seen.has(m.question)) return false;
    seen.add(m.question);
    return true;
  });
  all.sort((a, b) => b.volume - a.volume);
  return all;
}

export default async function Home() {
  const markets = await getMarkets();
  const realCount = markets.filter((m) => m.realMoney).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* terminal-style header */}
        <header className="mb-6 border-b border-zinc-800/80 pb-5">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-amber-400">signal</span>
              <span className="text-zinc-500 font-mono">402</span>
            </h1>
            <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">
              prediction market screener
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-1.5 font-mono">
            Signal through the noise. {markets.length} markets across 2 sources.
            You decide.
          </p>
          {/* quick stat strip */}
          <div className="flex gap-4 mt-3 font-mono text-xs">
            <span className="text-zinc-500">
              <span className="text-emerald-400">{realCount}</span> real-money
            </span>
            <span className="text-zinc-500">
              <span className="text-zinc-300">{markets.length - realCount}</span>{" "}
              play-money
            </span>
          </div>
        </header>

        <MarketTable markets={markets} />

        <footer className="mt-8 text-xs text-zinc-700 font-mono leading-relaxed">
          Data: Polymarket (real money) · Manifold (play money). 24h = change in
          Yes probability over the last day, in points, where available. Signal402
          displays public market data and does not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
