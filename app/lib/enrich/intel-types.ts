import type { CategoryId, NormalizedMarket, Source } from "./types";

export type EventKind = "fixture" | "outright" | "generic";

export interface EventKey {
  key: string;
  kind: EventKind;
  subject?: string; // the entity the YES probability refers to (e.g. "spain")
}

export interface MatchedGroup {
  key: string;
  kind: EventKind;
  members: NormalizedMarket[]; // each carries an inferred `subject` when detectable
}

// A per-source probability aligned to one reference subject, with a weight for consensus.
export interface AlignedPoint {
  source: Source;
  prob: number;      // aligned to the reference subject (complement-flipped for fixtures)
  subject?: string;
  weight: number;    // liquidity/volume proxy; play money down-weighted; TxLINE gets a constant
}

export interface HolderPosition {
  side: "yes" | "no";
  sizeUsd: number;
}

export interface TrustInputs {
  source: Source;
  volume?: number;
  liquidity?: number;
  topHolderSharePct?: number; // 0..100, concentration of the largest holder(s)
  ageDays?: number;
  spreadPts?: number;         // bid/ask spread in points, if available
}

export interface ResolutionRecord {
  category: CategoryId;
  source: Source;
  pricedYes: number;          // the market price at some reference time, 0..1
  outcome: "yes" | "no";
  resolvedAt: number;
}
