// app/api/txline/route.ts
// Returns TxLINE World Cup fixtures mapped to Market[]. Verifies the client
// works inside Next.js server runtime.

import { NextResponse } from "next/server";
import { getTxlineMarkets } from "../../lib/txline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await getTxlineMarkets();
    return NextResponse.json({
      count: markets.length,
      withOdds: markets.filter((m) => m.yes >= 0).length,
      markets,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
