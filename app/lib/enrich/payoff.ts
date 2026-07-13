import type { NormalizedMarket, Payoff, SidePayoff } from "./types";

const clamp01 = (x: number) => Math.max(0.0001, Math.min(0.9999, x));
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// For a binary outcome priced at p (0..1): a correct share bought at p returns (1-p)/p as profit,
// a wrong one loses the full stake. This is arithmetic, not a recommendation.
function side(sideName: "yes" | "no", price: number, stake: number, consensus?: number): SidePayoff {
  const p = clamp01(price);
  const toWin = stake * (1 - p) / p;
  const ifRightReturnPct = round(((1 - p) / p) * 100);
  const evAtConsensus =
    consensus === undefined ? undefined : round(clamp01(consensus) * toWin - (1 - clamp01(consensus)) * stake);
  return {
    side: sideName,
    price: round(p, 4),
    atRisk: round(stake),
    toWin: round(toWin),
    ifRightReturnPct,
    ifWrongLossPct: 100,
    evAtConsensus,
  };
}

export function computePayoff(m: Pick<NormalizedMarket, "priceYes" | "consensusYes">, stake = 100): Payoff {
  const priceYes = clamp01(m.priceYes);
  const priceNo = clamp01(1 - m.priceYes);
  const consensusYes = m.consensusYes;
  const consensusNo = consensusYes === undefined ? undefined : 1 - consensusYes;

  const yes = side("yes", priceYes, stake, consensusYes);
  const no = side("no", priceNo, stake, consensusNo);

  const edge =
    consensusYes === undefined ? undefined : round((consensusYes - priceYes) * 100, 1); // in points

  let note: string | undefined;
  if (edge !== undefined) {
    if (edge > 0) note = `Priced ${Math.abs(edge)} pts below consensus on YES`;
    else if (edge < 0) note = `Priced ${Math.abs(edge)} pts above consensus on YES`;
    else note = "In line with consensus";
  }

  return {
    yes,
    no,
    breakevenYes: round(priceYes, 4),
    consensusYes: consensusYes === undefined ? undefined : round(consensusYes, 4),
    edgeVsConsensusPct: edge,
    note,
  };
}
