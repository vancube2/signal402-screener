// app/page.tsx
// Signal402 - prediction market screener
// Build 5: paginate via offset to gather a varied pool (not just the top-volume cluster)

import MarketTable, { Market } from "./MarketTable";

type PolymarketMarket = {
  question: string;
  volume?: string;
  outcomePrices?: string;
  oneDayPriceChange?: number;
};

async function fetchPage(offset: number): Promise<PolymarketMarket[]> {
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

async function getMarkets(): Promise<Market[]> {
  // Pull several pages in parallel for variety
  const pages = await Promise.all([
    fetchPage(0),
    fetchPage(100),
    fetchPage(200),
    fetchPage(300),
  ]);
  const all = pages.flat();

  const cleaned: Market[] = all.map((m) => {
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
    const vol = parseFloat(m.volume ?? "0") || 0;
    return { question: m.question ?? "(untitled)", yes, move, volume: vol };
  });

  // de-duplicate by question (offset pages can overlap)
  const seen = new Set<string>();
  const unique = cleaned.filter((m) => {
    if (seen.has(m.question)) return false;
    seen.add(m.question);
    return true;
  });

  unique.sort((a, b) => b.volume - a.volume);
  return unique;
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
          Data from Polymarket. The 24h column shows the change in the Yes
          probability over the last day, in percentage points. Signal402
          displays public market data and does not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
