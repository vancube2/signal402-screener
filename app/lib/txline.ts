// app/lib/txline.ts
// Server-side TxLINE client for Signal402 (World Cup build).
// Path A: long-lived API token in env + short-lived guest JWTs. No wallet on server.
// TxLINE is the PRIMARY data source. We DISPLAY verifiable market data — implied
// probabilities and match state — we do not solicit or place bets.

import { Market } from "../types";

const API_ORIGIN =
  process.env.TXLINE_API_ORIGIN || "https://txline-dev.txodds.com";
const API_TOKEN = process.env.TXLINE_API_TOKEN || "";

// ---- cached guest JWT (valid 30 days; refresh daily) ----
let cachedJwt: { token: string; fetchedAt: number } | null = null;
const JWT_TTL_MS = 24 * 60 * 60 * 1000;

async function getJwt(): Promise<string> {
  const now = Date.now();
  if (cachedJwt && now - cachedJwt.fetchedAt < JWT_TTL_MS) return cachedJwt.token;
  const res = await fetch(`${API_ORIGIN}/auth/guest/start`, { method: "POST", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`guest/start failed: ${res.status}`);
  const data = await res.json();
  cachedJwt = { token: data.token, fetchedAt: now };
  return data.token;
}

async function txGet<T>(path: string): Promise<T | null> {
  if (!API_TOKEN) throw new Error("TXLINE_API_TOKEN not set");
  try {
    const jwt = await getJwt();
    const res = await fetch(`${API_ORIGIN}${path}`, {
      headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": API_TOKEN },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---- raw shapes ----
type TxFixture = {
  Ts: number;
  StartTime: number; // ms
  Competition: string;
  CompetitionId: number;
  Participant1Id: number;
  Participant1: string;
  Participant2Id: number;
  Participant2: string;
  FixtureId: number;
  Participant1IsHome: boolean;
};

type TxOdds = {
  SuperOddsType: string;
  MarketPeriod: string | null;
  InRunning: boolean;
  PriceNames: string[];
  Pct: string[]; // implied % strings, demargined
  Ts: number;
};

type TxScore = {
  GameState: string | null; // "scheduled" | "in_play" | "finished" | ...
  Action: string;
  Ts: number;
};

function fmtDateMs(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// pick the full-match 1X2 result odds; return home-win implied % (0..100) or -1
function homeImpliedPct(odds: TxOdds[] | null): number {
  if (!odds || odds.length === 0) return -1;
  // prefer full-time 1X2 participant result, not a half
  const full =
    odds.find(
      (o) =>
        o.SuperOddsType === "1X2_PARTICIPANT_RESULT" &&
        (!o.MarketPeriod || !o.MarketPeriod.includes("half=1"))
    ) || odds.find((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!full) return -1;
  const i = full.PriceNames.findIndex((n) => n === "part1");
  if (i === -1) return -1;
  const pct = parseFloat(full.Pct[i]);
  return isNaN(pct) ? -1 : Math.round(pct);
}

// human game-state label for the context field
function gameStateLabel(scores: TxScore[] | null): string {
  if (!scores || scores.length === 0) return "";
  // latest by Ts
  const latest = [...scores].sort((a, b) => b.Ts - a.Ts)[0];
  const gs = latest.GameState || "";
  const map: Record<string, string> = {
    scheduled: "Scheduled",
    in_play: "Live",
    inplay: "Live",
    finished: "Finished",
    ended: "Finished",
    postponed: "Postponed",
    cancelled: "Cancelled",
  };
  return map[gs.toLowerCase()] || gs;
}

// ---- main: fixtures -> markets, enriched with odds + game state ----
let lastGoodTxline: Market[] | null = null;

export async function getTxlineMarkets(): Promise<Market[]> {
  const fixtures = await txGet<TxFixture[]>("/api/fixtures/snapshot");
  if (!fixtures || fixtures.length === 0) return lastGoodTxline ?? [];

  // fetch odds + scores per fixture in parallel (bounded)
  const markets = await Promise.all(
    fixtures.map(async (f) => {
      const [odds, scores] = await Promise.all([
        txGet<TxOdds[]>(`/api/odds/snapshot/${f.FixtureId}`),
        txGet<TxScore[]>(`/api/scores/snapshot/${f.FixtureId}`),
      ]);
      const yes = homeImpliedPct(odds);
      const state = gameStateLabel(scores);
      const stateSuffix = state ? ` · ${state}` : "";
      const inRunning = state === "Live" || (odds?.some((o) => o.InRunning) ?? false);

      const m: Market = {
        question: `${f.Participant1} vs ${f.Participant2}`,
        yes, // home-win implied probability (demargined), -1 if none yet
        no: yes >= 0 ? 100 - yes : -1,
        move: null,
        volume: 0,
        source: "TxLINE",
        realMoney: false,
        description:
          `${f.Competition}${stateSuffix}. Implied probability that ${f.Participant1} ` +
          `wins, from TxLINE demargined consensus odds. Verifiable on-chain.`,
        url: "",
        closeDate: fmtDateMs(f.StartTime),
        liquidity: 0,
        fixtureId: String(f.FixtureId),
        competitionId: f.CompetitionId,
        home: f.Participant1,
        away: f.Participant2,
        gameState: state,
        inRunning,
        startTime: f.StartTime,
      };
      return m;
    })
  );

  if (markets.length > 0) lastGoodTxline = markets;
  return markets;
}


// ---- Merkle proof (data receipt) for a fixture ----
export async function getFixtureProof(fixtureId: string): Promise<unknown | null> {
  return txGet(`/api/fixtures/validation?fixtureId=${encodeURIComponent(fixtureId)}`);
}
