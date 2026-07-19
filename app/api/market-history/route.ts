// app/api/market-history/route.ts
// Unified price/probability history for a market, normalized across sources into
// a single [{ t: ms, yes: percent }] series. This is the foundation for Replay
// and Investigation. Every point is REAL data pulled from the source; nothing is
// synthesized. Where a source has no history, the series comes back empty and the
// UI says so honestly.
//
// Query: /api/market-history?source=Polymarket&clob=...&manifold=...&fixture=...

import { NextRequest, NextResponse } from "next/server";

type Point = { t: number; yes: number };

// ---- Polymarket: CLOB price history (same upstream the chart already uses) ----
async function polymarketHistory(tokenId: string): Promise<Point[]> {
  const url = `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(
    tokenId
  )}&interval=1w&fidelity=60`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  const data = await res.json();
  const history = Array.isArray(data.history) ? data.history : [];
  return history
    .filter(
      (pt: { t?: number; p?: number }) =>
        typeof pt.t === "number" && typeof pt.p === "number"
    )
    .map((pt: { t: number; p: number }) => ({
      t: pt.t * 1000,
      yes: Math.round(pt.p * 100),
    }));
}

// ---- Manifold: /v0/bets gives probAfter + createdTime, a continuous history ----
async function manifoldHistory(contractId: string): Promise<Point[]> {
  const url = `https://api.manifold.markets/v0/bets?contractId=${encodeURIComponent(
    contractId
  )}&limit=1000`;
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return [];
  const bets = await res.json();
  if (!Array.isArray(bets)) return [];
  // bets come newest-first; map to points and sort oldest-first
  const pts: Point[] = bets
    .filter(
      (b: { createdTime?: number; probAfter?: number }) =>
        typeof b.createdTime === "number" && typeof b.probAfter === "number"
    )
    .map((b: { createdTime: number; probAfter: number }) => ({
      t: b.createdTime,
      yes: Math.round(b.probAfter * 100),
    }));
  pts.sort((a, b) => a.t - b.t);
  // collapse to at most ~200 points to keep it light, keeping shape
  return decimate(pts, 200);
}

// ---- TxLINE: sample asOf across a window; real odds history (flat on devnet) --
const TX_ORIGIN =
  process.env.TXLINE_API_ORIGIN || "https://txline-dev.txodds.com";
const TX_TOKEN = process.env.TXLINE_API_TOKEN || "";
let txJwt: { token: string; at: number } | null = null;

async function txGetJwt(): Promise<string | null> {
  const now = Date.now();
  if (txJwt && now - txJwt.at < 24 * 3600 * 1000) return txJwt.token;
  const r = await fetch(`${TX_ORIGIN}/auth/guest/start`, {
    method: "POST",
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  txJwt = { token: d.token, at: now };
  return d.token;
}

function txHomePct(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  type O = {
    SuperOddsType?: string;
    MarketPeriod?: string | null;
    PriceNames?: string[];
    Pct?: string[];
  };
  const os = rows as O[];
  const full =
    os.find(
      (o) =>
        o.SuperOddsType === "1X2_PARTICIPANT_RESULT" &&
        (!o.MarketPeriod || !o.MarketPeriod.includes("half=1"))
    ) || os.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!full || !full.PriceNames || !full.Pct) return null;
  const i = full.PriceNames.findIndex((n) => n === "part1");
  if (i < 0) return null;
  const pct = parseFloat(full.Pct[i]);
  return Number.isNaN(pct) ? null : Math.round(pct);
}

async function txlineHistory(fixtureId: string): Promise<Point[]> {
  if (!TX_TOKEN) return [];
  const jwt = await txGetJwt();
  if (!jwt) return [];
  const H = {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": TX_TOKEN,
  };
  const now = Date.now();
  // sample 12 points across the last 24h
  const hoursBack = [24, 22, 20, 18, 16, 12, 8, 6, 4, 2, 1, 0];
  const points: Point[] = [];
  await Promise.all(
    hoursBack.map(async (h) => {
      const asOf = now - h * 3600 * 1000;
      try {
        const r = await fetch(
          `${TX_ORIGIN}/api/odds/snapshot/${fixtureId}?asOf=${asOf}`,
          { headers: H, signal: AbortSignal.timeout(4000) }
        );
        if (!r.ok) return;
        const yes = txHomePct(await r.json());
        if (yes != null) points.push({ t: asOf, yes });
      } catch {
        // skip this sample
      }
    })
  );
  points.sort((a, b) => a.t - b.t);
  return points;
}

// keep at most `max` points, evenly spaced, preserving first and last
function decimate(pts: Point[], max: number): Point[] {
  if (pts.length <= max) return pts;
  const step = pts.length / max;
  const out: Point[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.floor(i * step)]);
  out[out.length - 1] = pts[pts.length - 1];
  return out;
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");
  const clob = req.nextUrl.searchParams.get("clob");
  const manifold = req.nextUrl.searchParams.get("manifold");
  const fixture = req.nextUrl.searchParams.get("fixture");

  try {
    let series: Point[] = [];
    if (source === "Polymarket" && clob) series = await polymarketHistory(clob);
    else if (source === "Manifold" && manifold)
      series = await manifoldHistory(manifold);
    else if (source === "TxLINE" && fixture)
      series = await txlineHistory(fixture);

    return NextResponse.json({
      source,
      count: series.length,
      series,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown", series: [] },
      { status: 200 }
    );
  }
}
