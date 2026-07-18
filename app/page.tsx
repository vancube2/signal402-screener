// app/page.tsx
// Signal402 - prediction market screener
// Build 9: add cross-platform Compare view (framework, ready for more sources)

import ScreenerApp from "./ScreenerApp";
import { AmbientBackdrop } from "./Ambience";
import { Market } from "./types";

function fmtDate(input?: string | number): string {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// ---------- Polymarket ----------
type PolymarketEvent = { slug?: string };
type PolymarketMarket = {
  question?: string;
  description?: string;
  slug?: string;
  events?: PolymarketEvent[];
  volume?: string;
  liquidity?: string;
  outcomePrices?: string;
  oneDayPriceChange?: number;
  endDate?: string;
  clobTokenIds?: string;
  conditionId?: string;
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

function polyUrl(m: PolymarketMarket): string {
  const eventSlug = m.events && m.events[0] ? m.events[0].slug : undefined;
  if (eventSlug) return `https://polymarket.com/event/${eventSlug}`;
  if (m.slug) return `https://polymarket.com/event/${m.slug}`;
  return "https://polymarket.com";
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
    let no = -1;
    if (m.outcomePrices) {
      try {
        const prices = JSON.parse(m.outcomePrices) as string[];
        if (prices.length > 0) yes = Math.round(parseFloat(prices[0]) * 100);
        if (prices.length > 1) no = Math.round(parseFloat(prices[1]) * 100);
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
      no,
      move,
      volume: parseFloat(m.volume ?? "0") || 0,
      source: "Polymarket" as const,
      realMoney: true,
      description: m.description ?? "",
      url: polyUrl(m),
      closeDate: fmtDate(m.endDate),
      liquidity: parseFloat(m.liquidity ?? "0") || 0,
      clobTokenId: (() => {
        try {
          const ids = m.clobTokenIds ? (JSON.parse(m.clobTokenIds) as string[]) : [];
          return Array.isArray(ids) && ids.length > 0 ? ids[0] : undefined;
        } catch {
          return undefined;
        }
      })(),
      conditionId: m.conditionId,
    };
  });
}

// ---------- Manifold ----------
type ManifoldMarket = {
  id?: string;
  question?: string;
  probability?: number;
  volume?: number;
  outcomeType?: string;
  isResolved?: boolean;
  url?: string;
  textDescription?: string;
  closeTime?: number;
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
      .map((m) => {
        const yes = Math.round((m.probability ?? 0) * 100);
        return {
          question: m.question ?? "(untitled)",
          yes,
          no: 100 - yes,
          move: null,
          volume: m.volume ?? 0,
          source: "Manifold" as const,
          realMoney: false,
          description: m.textDescription ?? "",
          url: m.url ?? "https://manifold.markets",
          closeDate: fmtDate(m.closeTime),
          liquidity: 0,
          marketId: m.id,
        };
      });
  } catch {
    return [];
  }
}

export async function getMarkets(): Promise<Market[]> {
  const [poly, manifold] = await Promise.all([
    getPolymarket(),
    getManifold(),
  ]);
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
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <AmbientBackdrop />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 border-b border-zinc-800/80 pb-8">
  <div className="flex items-center gap-4 flex-wrap">
    <img
      src="/signal402-wordmark.png"
      alt="Signal402"
      className="h-10 sm:h-12 w-auto"
    />

    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-300">
      TRUSTED SPORTS INTELLIGENCE
    </span>
  </div>

  <h1 className="mt-6 text-4xl font-bold tracking-tight text-white">
    Real-time sports intelligence powered by TxLINE.
  </h1>

  <p className="mt-4 max-w-3xl text-zinc-400 leading-7">
    Compare prediction markets across sources, track how odds move
    with grounded AI, and verify match data with cryptographic proofs.
  </p>

  <div className="mt-6 flex flex-wrap gap-3">
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
      <span
        className="s402-anim h-2 w-2 rounded-full bg-emerald-400"
        style={{ animation: "s402heartbeat 2s ease-in-out infinite" }}
      ></span>
      LIVE DATA
    </span>

    <span className="rounded-full bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
      TxLINE
    </span>

    <span className="rounded-full bg-purple-500/10 px-3 py-2 text-sm text-purple-300">
      Grounded AI
    </span>

    <span className="rounded-full bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
      Verifiable
    </span>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">Markets</div>
      <div className="mt-2 text-2xl font-bold">{markets.length}</div>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">Sources</div>
      <div className="mt-2 text-2xl font-bold">
        {new Set(markets.map((m) => m.source)).size}
      </div>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">Status</div>
      <div className="mt-2 text-2xl font-bold text-emerald-400">
        LIVE
      </div>
    </div>

    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">AI</div>
      <div className="mt-2 text-2xl font-bold">
        Grounded
      </div>
    </div>
  </div>
</header>

        <ScreenerApp markets={markets} />

        <footer className="mt-8 text-xs text-zinc-700 font-mono leading-relaxed">
          Data: Polymarket (real money) · Manifold (play money). 24h = change in
          Yes probability over the last day, in points, where available. Signal402
          displays public market data and does not provide betting advice.
        </footer>
      </div>
    </main>
  );
}
