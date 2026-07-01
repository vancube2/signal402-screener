// app/types.ts
// Shared market type for the screener

export type Market = {
  question: string;
  yes: number; // -1 if unknown
  no: number; // -1 if unknown
  move: number | null; // 24h change in percentage points
  volume: number;
  source: "Polymarket" | "Manifold";
  realMoney: boolean;
  description: string; // may be empty
  url: string; // link to the market on its platform
  closeDate: string; // human-readable, may be empty
  liquidity: number; // 0 if unknown
  clobTokenId?: string; // Polymarket Yes-token id, for price history
};
