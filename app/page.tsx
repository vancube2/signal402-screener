// app/page.tsx
// Signal402 - prediction market screener
// Build 6: multi-source (Polymarket + Manifold), with source labels

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
  volume24Hours?: number;
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
        move: null, // Manifold doesn't give a simple 24h delta here
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

  // de-duplicate by question within the combined set
  const seen = new Set<string>();
  const all = [...poly, ...manifold].filter((m) => {
    if (seen.has(m.question)) return false;
    seen.add(m.question);
    return true;
  });

  // sort by volume desc (note: cross-source volume isn't directly comparable;
  // the source filter lets users view one platform at a time)
  all.sort((a, b) => b.volume - a.volume);
  return all;
}

export default async function Home() {
  const markets = await getMarkets();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Signal402</h1>
          <p className="text-neutral-400 mt-1">
            A screener for prediction markets. Live data, no noise. You decide.
          </p>
        </header>

        <MarketTable markets={markets} />

        <footer className="mt-8 text-xs text-neutral-600">
          Data from Polymarket (real money) and Manifold (play money). The 24h
          column shows the change in the Yes probability over the last day, in
          percentage points, where available. Signal402 displays public market
          data and does not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
