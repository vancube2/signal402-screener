// app/api/history/route.ts
// Fetches Yes-price history for a Polymarket market (by CLOB token id).
// Public endpoint, no auth. Returns a clean [{ t, p }] series.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get("token");
  const interval = req.nextUrl.searchParams.get("interval") || "1w";

  if (!tokenId) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const url = `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(
      tokenId
    )}&interval=${encodeURIComponent(interval)}&fidelity=60`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ history: [] }, { status: 200 });
    }
    const data = await res.json();
    const history = Array.isArray(data.history) ? data.history : [];

    // normalise: t (unix seconds) -> ms, p (0..1) -> percent
    const series = history
      .filter(
        (pt: { t?: number; p?: number }) =>
          typeof pt.t === "number" && typeof pt.p === "number"
      )
      .map((pt: { t: number; p: number }) => ({
        t: pt.t * 1000,
        yes: Math.round(pt.p * 100),
      }));

    return NextResponse.json({ series });
  } catch {
    return NextResponse.json({ series: [] }, { status: 200 });
  }
}
