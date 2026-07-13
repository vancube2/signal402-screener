// app/api/polymarket-holders/route.ts
// Top-holder lean per side for a Polymarket market, from the public Data API.
// data-api.polymarket.com/holders returns up to 20 holders PER outcome token,
// so this is a top-holder view, not the full pot. Real money. No auth.

import { NextRequest, NextResponse } from "next/server";

type Holder = { amount?: number; outcomeIndex?: number };
type TokenHolders = { token?: string; holders?: Holder[] };

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  const yesToken = req.nextUrl.searchParams.get("yes");
  if (!cid) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  try {
    const url = `https://data-api.polymarket.com/holders?market=${encodeURIComponent(
      cid
    )}&limit=20`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) {
      return NextResponse.json({ available: false }, { status: 200 });
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    let yesShares = 0;
    let noShares = 0;
    let yesCount = 0;
    let noCount = 0;

    for (const entry of data as TokenHolders[]) {
      const holders = Array.isArray(entry.holders) ? entry.holders : [];
      // side: match the outcome token id when we have it, else fall back to outcomeIndex 0 = Yes
      const tokenIsYes =
        yesToken && entry.token ? entry.token === yesToken : null;
      for (const h of holders) {
        const amt = typeof h.amount === "number" ? h.amount : 0;
        const isYes = tokenIsYes !== null ? tokenIsYes : h.outcomeIndex === 0;
        if (isYes) {
          yesShares += amt;
          yesCount++;
        } else {
          noShares += amt;
          noCount++;
        }
      }
    }

    if (yesShares + noShares <= 0) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    return NextResponse.json({
      available: true,
      partial: true,
      yesShares: Math.round(yesShares),
      noShares: Math.round(noShares),
      yesCount,
      noCount,
    });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
