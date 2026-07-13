import type { NormalizedMarket, Source } from "./types";

export interface ResolutionInfo {
  resolver: string;
  method: string;
  verifiable: boolean;      // can a viewer independently check the resolution?
  disputeWindow?: string;
  criteria?: string;        // plain-language resolution terms, if present on the market
  note: string;
}

const BY_SOURCE: Record<Source, Omit<ResolutionInfo, "criteria">> = {
  polymarket: {
    resolver: "UMA Optimistic Oracle",
    method: "A proposer submits the outcome on-chain; it stands unless disputed within a challenge window.",
    verifiable: true,
    disputeWindow: "UMA challenge period",
    note: "Independently verifiable on-chain, subject to the dispute window.",
  },
  manifold: {
    resolver: "Market creator",
    method: "The creator selects the outcome; Manifold retains discretion to re-resolve, cancel, or void.",
    verifiable: false,
    note: "Depends on creator honesty and wording quality. Not independently verifiable.",
  },
  txline: {
    resolver: "TxLINE on-chain Merkle commitment",
    method: "Each fixture record is committed to an on-chain Merkle root; a proof path validates it against the on-chain program.",
    verifiable: true,
    note: "Verifiable end to end via the proof receipt.",
  },
};

// Try to lift resolution criteria out of the description (first meaningful sentence).
function extractCriteria(desc?: string): string | undefined {
  if (!desc) return undefined;
  const sentence = desc.split(/(?<=[.!?])\s/)[0]?.trim();
  return sentence && sentence.length > 12 ? sentence : undefined;
}

export function resolutionInfo(m: Pick<NormalizedMarket, "source" | "description">): ResolutionInfo {
  return { ...BY_SOURCE[m.source], criteria: extractCriteria(m.description) };
}
