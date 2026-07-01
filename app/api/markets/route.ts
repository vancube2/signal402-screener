// app/api/markets/route.ts
// Serves the current market list for the client's periodic refresh.
// Reuses the same getMarkets() the server page uses, so there is one
// source of truth for how markets are assembled.

import { NextResponse } from "next/server";
import { getMarkets } from "../../page";

// don't cache at the route layer; getMarkets already controls upstream revalidation
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await getMarkets();
    return NextResponse.json({ markets });
  } catch {
    // on failure return empty; the client keeps its last good data
    return NextResponse.json({ markets: [] }, { status: 200 });
  }
}
