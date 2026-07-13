import type { CategoryId, Source } from "./types";
import type { ResolutionRecord } from "./intel-types";

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

// Minimal append-only store. Swap the in-memory impl for your DB; the interface is the contract.
export interface ResolutionStore {
  add(r: ResolutionRecord): void;
  all(): ResolutionRecord[];
}

export function inMemoryStore(seed: ResolutionRecord[] = []): ResolutionStore {
  const rows = [...seed];
  return { add: (r) => void rows.push(r), all: () => rows.slice() };
}

export interface BaseRateFilter {
  category?: CategoryId;
  source?: Source;
}

function decile(p: number): number {
  return Math.min(9, Math.max(0, Math.floor(p * 10))); // 0..9 -> [0-10%),[10-20%),...
}

// For markets that were priced in the same decile as `pricedYes`, how often did they actually
// resolve YES? This is the base rate a viewer should weigh against the current price.
export function baseRate(
  records: ResolutionRecord[],
  pricedYes: number,
  filter: BaseRateFilter = {},
): { bucketPct: string; n: number; actualYesPct: number | null; calibrationErrorPts: number | null } {
  const d = decile(pricedYes);
  const rows = records.filter(
    (r) =>
      decile(r.pricedYes) === d &&
      (filter.category === undefined || r.category === filter.category) &&
      (filter.source === undefined || r.source === filter.source),
  );
  const bucketPct = `${d * 10}-${d * 10 + 10}%`;
  if (rows.length === 0) return { bucketPct, n: 0, actualYesPct: null, calibrationErrorPts: null };
  const yes = rows.filter((r) => r.outcome === "yes").length;
  const actual = (yes / rows.length) * 100;
  const predictedMid = d * 10 + 5;
  return { bucketPct, n: rows.length, actualYesPct: round(actual), calibrationErrorPts: round(Math.abs(actual - predictedMid)) };
}

// Full calibration table across all deciles: predicted midpoint vs actual YES rate.
export function calibrationTable(
  records: ResolutionRecord[],
  filter: BaseRateFilter = {},
): { bucket: string; predictedPct: number; actualPct: number | null; n: number }[] {
  const rows = records.filter(
    (r) =>
      (filter.category === undefined || r.category === filter.category) &&
      (filter.source === undefined || r.source === filter.source),
  );
  const out = [];
  for (let d = 0; d < 10; d++) {
    const inBucket = rows.filter((r) => decile(r.pricedYes) === d);
    const yes = inBucket.filter((r) => r.outcome === "yes").length;
    out.push({
      bucket: `${d * 10}-${d * 10 + 10}%`,
      predictedPct: d * 10 + 5,
      actualPct: inBucket.length ? round((yes / inBucket.length) * 100) : null,
      n: inBucket.length,
    });
  }
  return out;
}
