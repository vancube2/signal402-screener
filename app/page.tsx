// app/page.tsx
// Signal402 - prediction market screener (first build: Polymarket markets list)

type PolymarketMarket = {
  question: string;
  volume?: string;
  outcomePrices?: string; // JSON string like "[\"0.73\", \"0.27\"]"
  active?: boolean;
  closed?: boolean;
};

async function getMarkets(): Promise<PolymarketMarket[]> {
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=30&order=volume&ascending=false",
      { next: { revalidate: 60 } } // cache for 60s
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function yesPrice(m: PolymarketMarket): string {
  // outcomePrices is a JSON string; first value is usually the "Yes" probability
  if (!m.outcomePrices) return "-";
  try {
    const prices = JSON.parse(m.outcomePrices) as string[];
    if (prices.length > 0) {
      const pct = Math.round(parseFloat(prices[0]) * 100);
      return `${pct}%`;
    }
  } catch {
    return "-";
  }
  return "-";
}

function formatVolume(v?: string): string {
  if (!v) return "-";
  const n = parseFloat(v);
  if (isNaN(n)) return "-";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default async function Home() {
  const markets = await getMarkets();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Signal402</h1>
          <p className="text-neutral-400 mt-1">
            A screener for prediction markets. Live data, no noise. You decide.
          </p>
        </header>

        {markets.length === 0 ? (
          <p className="text-neutral-500">
            No markets loaded. The data source may be unreachable right now.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Market</th>
                  <th className="px-4 py-3 font-medium text-right">Yes</th>
                  <th className="px-4 py-3 font-medium text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m, i) => (
                  <tr
                    key={i}
                    className="border-t border-neutral-800 hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3 max-w-xl">{m.question}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-400">
                      {yesPrice(m)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                      {formatVolume(m.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-8 text-xs text-neutral-600">
          Data from Polymarket. Signal402 displays public market data and does
          not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
