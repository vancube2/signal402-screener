// app/api/calibration/route.ts
// Live calibration from Manifold's resolved binary markets: for markets priced in each
// probability bucket, how often did they actually resolve YES? No store, no key.
// The pool keeps the pre-resolution probability after resolving, so it is a valid predicted value.

import { NextResponse } from "next/server";
import { calibrationTable } from "../../lib/enrich/baserates";
import type { ResolutionRecord } from "../../lib/enrich/intel-types";

type LiteMarket = {
  outcomeType?: string;
  isResolved?: boolean;
  resolution?: string;
  probability?: number;
  resolutionTime?: number;
};

export async function GET() {
  try {
    const res = await fetch(
      "https://api.manifold.markets/v0/search-markets?filter=resolved&contractType=BINARY&sort=resolve-date&limit=1000",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ available: false });

    const markets = (await res.json()) as LiteMarket[];
    if (!Array.isArray(markets)) return NextResponse.json({ available: false });

    const records: ResolutionRecord[] = [];
    for (const m of markets) {
      if (m.outcomeType !== "BINARY" || !m.isResolved) continue;
      if (m.resolution !== "YES" && m.resolution !== "NO") continue; // skip MKT / CANCEL
      if (typeof m.probability !== "number" || m.probability < 0 || m.probability > 1) continue;
      records.push({
        category: "world",
        source: "manifold",
        pricedYes: m.probability,
        outcome: m.resolution === "YES" ? "yes" : "no",
        resolvedAt: m.resolutionTime ?? 0,
      });
    }

    if (records.length === 0) return NextResponse.json({ available: false });

    const table = calibrationTable(records);
    return NextResponse.json({ available: true, total: records.length, table });
  } catch {
    return NextResponse.json({ available: false });
  }
}
