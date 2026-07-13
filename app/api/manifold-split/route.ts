// app/api/manifold-split/route.ts
// Current stake per side for a Manifold market, from the positions endpoint.
// Sums mana spent acquiring YES vs NO across the holders the API returns.
// Play money. Public endpoint, no auth.

import { NextRequest, NextResponse } from "next/server";

type Position = {
  invested?: number;
  totalSpent?: { YES?: number; NO?: number };
  maxSharesOutcome?: "YES" | "NO";
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const url = `https://api.manifold.markets/v0/market/${encodeURIComponent(
      id
    )}/positions?top=250`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) {
      return NextResponse.json({ available: false }, { status: 200 });
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    let yes = 0;
    let no = 0;
    let holders = 0;
    for (const r of rows as Position[]) {
      holders++;
      const ts = r.totalSpent;
      if (ts && (typeof ts.YES === "number" || typeof ts.NO === "number")) {
        yes += ts.YES ?? 0;
        no += ts.NO ?? 0;
      } else if (typeof r.invested === "number") {
        // fallback: attribute a holder's stake to the side they mostly hold
        if (r.maxSharesOutcome === "NO") no += r.invested;
        else yes += r.invested;
      }
    }

    if (yes + no <= 0) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    return NextResponse.json({
      available: true,
      unit: "mana",
      yes: Math.round(yes),
      no: Math.round(no),
      holders,
    });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
