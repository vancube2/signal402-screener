// app/types.ts
// Shared market type for the screener

export type Market = {
  question: string;
  yes: number; // -1 if unknown
  move: number | null; // 24h change in percentage points, null if unknown
  volume: number; // in the source's own units
  source: "Polymarket" | "Manifold";
  realMoney: boolean; // true = real money, false = play money
};
