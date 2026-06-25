// app/page.tsx
// Signal402 - prediction market screener
// Build 2: reliable volume sorting + 24h movement column

type PolymarketMarket = {
  question: string;
  volume?: string;
  outcomePrices?: string; // JSON string like "[\"0.73\", \"0.27\"]"
  oneDayPriceChange?: number;
  active?: boolean;
  closed?: boolean;
};

async function getMarkets(): Promise<PolymarketMarket[]> {
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100",
      { next: { revalidate: 60 } } // cache for 60s
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Sort by volume descending, in-code (reliable)
    const sorted = (data as PolymarketMarket[]).sort((a, b) => {
      const va = parseFloat(a.volume ?? "0") || 0;
      const vb = parseFloat(b.volume ?? "0") || 0;
      return vb - va;
    });

    return sorted.slice(0, 40);
  } catch {
    return [];
  }
}

function yesPrice(m: PolymarketMarket): string {
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

// Returns { text, className } for the 24h change cell
function movement(m: PolymarketMarket): { text: string; className: string } {
  const c = m.oneDayPriceChange;
  if (c === undefined || c === null || isNaN(c)) {
    return { text: "-", className: "text-neutral-600" };
  }
  const pts = Math.round(c * 100); // change in percentage points
  if (pts > 0) return { text: `+${pts}`, className: "text-emerald-400" };
  if (pts < 0) return { text: `${pts}`, className: "text-rose-400" };
  return { text: "0", className: "text-neutral-500" };
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
                  <th className="px-4 py-3 font-medium text-right">24h</th>
                  <th className="px-4 py-3 font-medium text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m, i) => {
                  const move = movement(m);
                  return (
                    <tr
                      key={i}
                      className="border-t border-neutral-800 hover:bg-neutral-900/50"
                    >
                      <td className="px-4 py-3 max-w-xl">{m.question}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-400">
                        {yesPrice(m)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${move.className}`}
                      >
                        {move.text}
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

        <footer className="mt-8 text-xs text-neutral-600">
          Data from Polymarket. The 24h column shows the change in the Yes
          probability over the last day, in percentage points. Signal402
          displays public market data and does not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
