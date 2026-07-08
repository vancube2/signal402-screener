// app/api/txline/proof/route.ts
// Serves the Merkle proof (data receipt) for a TxLINE fixture. Keeps the API
// token server-side; the client calls this with just a fixtureId.

import { NextRequest, NextResponse } from "next/server";
import { getFixtureProof } from "../../../lib/txline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fixtureId = req.nextUrl.searchParams.get("fixtureId");
  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId required" }, { status: 400 });
  }
  try {
    const proof = await getFixtureProof(fixtureId);
    if (!proof) {
      return NextResponse.json({ error: "proof unavailable" }, { status: 404 });
    }
    return NextResponse.json(proof);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
