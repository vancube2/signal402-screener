// signal402 enrichment layer — shared types
// The normalized shape every source is mapped into before the UI touches it.

export type Source = "polymarket" | "manifold" | "txline";

export type MoneyKind = "real" | "play" | "none";

// Top-level categories. A market can carry more than one.
export type CategoryId =
  | "sports"
  | "politics"
  | "crypto"
  | "economy"
  | "weather"
  | "culture"
  | "science_tech"
  | "business"
  | "world";

export interface Category {
  id: CategoryId;
  label: string;
  // sub-tags like "football", "elections", "rates" — free-form, lower-cased
  tags: string[];
}

export type LifecycleState = "upcoming" | "live" | "resolved";

// What a viewer would gain or lose, shown per side. Pure display math, never advice.
export interface SidePayoff {
  side: "yes" | "no";
  price: number;           // 0..1, the break-even probability for this side
  atRisk: number;          // stake the viewer would put down
  toWin: number;           // profit if this side is correct
  ifRightReturnPct: number; // profit as a % of stake
  ifWrongLossPct: number;   // loss as a % of stake (always 100 for a full stake)
  evAtConsensus?: number;   // expected value using the demargined "true" prob, if we have one
}

export interface Payoff {
  yes: SidePayoff;
  no: SidePayoff;
  breakevenYes: number;     // = price of YES
  consensusYes?: number;    // demargined true probability of YES, if the source gives us one
  edgeVsConsensusPct?: number; // consensusYes - priceYes, in points; positive = priced below consensus
  note?: string;
}

// Participation. Deliberately honest: counts are wallets/accounts, not verified people,
// and availability differs per source. Never fabricated.
export interface Participation {
  available: boolean;
  reason?: string;          // shown when available === false (e.g. odds feed, no pool)
  unit: "wallets" | "accounts" | "none";
  moneyKind: MoneyKind;
  moneyLabel: string;       // "open interest", "mana staked", etc. Never call a CLOB a "pot".
  yesCount?: number;
  noCount?: number;
  yesMoney?: number;
  noMoney?: number;
  yesPct?: number;          // share of counted participants on YES
  partial?: boolean;        // true when we only have top-N holders, not a full count
}

export interface NormalizedMarket {
  id: string;
  source: Source;
  question: string;
  description?: string;
  sourceTags?: string[];    // tags/topics the source already provides
  priceYes: number;         // 0..1
  consensusYes?: number;    // demargined probability when available (TxLINE gives this)
  subject?: string;         // entity the YES prob refers to, e.g. "spain" (for sports divergence)
  volume?: number;
  liquidity?: number;       // depth proxy for trust/consensus weighting
  moneyKind: MoneyKind;
  closesAt?: number;        // epoch ms
  resolvesAt?: number;      // epoch ms
  resolved?: boolean;
  outcome?: "yes" | "no" | null;
}

export interface EnrichedMarket extends NormalizedMarket {
  categories: Category[];
  lifecycle: LifecycleState;
  payoff: Payoff;
  participation: Participation;
}
