import type { NormalizedMarket } from "./types";
import type { AlignedPoint, EventKey, MatchedGroup } from "./intel-types";

const TXLINE_WEIGHT = 5000; // odds feed has no volume; treat as a reliable fixed-weight source
const PLAY_MONEY_FACTOR = 0.5; // down-weight Manifold play money in consensus

export function normEntity(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Derive an event key and, where possible, the subject the YES prob refers to.
export function eventKeyOf(m: Pick<NormalizedMarket, "question" | "subject">): EventKey {
  const q = m.question ?? "";
  const lower = q.toLowerCase();

  // fixture: "A vs B", "A v B", "Will A beat/defeat B", "A to beat B"
  const fix =
    q.match(/^(.+?)\s+(?:vs\.?|v\.?)\s+(.+?)\??$/i) ||
    lower.match(/will\s+(.+?)\s+(?:beat|defeat)\s+(.+?)\??$/i) ||
    lower.match(/^(.+?)\s+to\s+beat\s+(.+?)\??$/i);
  if (fix) {
    const a = normEntity(fix[1]);
    const b = normEntity(fix[2]);
    const pair = [a, b].sort();
    return { key: `fixture:${pair[0]}|${pair[1]}`, kind: "fixture", subject: m.subject ? normEntity(m.subject) : a };
  }

  // outright: "Will A win (the) TOURNAMENT"
  const out = lower.match(/will\s+(.+?)\s+win\s+(?:the\s+)?(.+?)\??$/i);
  if (out) {
    const team = normEntity(out[1]);
    const tourney = normEntity(out[2]);
    return { key: `outright:${tourney}:${team}`, kind: "outright", subject: m.subject ? normEntity(m.subject) : team };
  }

  return { key: `generic:${normEntity(q)}`, kind: "generic", subject: m.subject ? normEntity(m.subject) : undefined };
}

// Group markets that refer to the same event, attaching an inferred subject.
export function groupEvents(markets: NormalizedMarket[]): MatchedGroup[] {
  const byKey = new Map<string, MatchedGroup>();
  for (const m of markets) {
    const ek = eventKeyOf(m);
    const withSubject: NormalizedMarket = { ...m, subject: m.subject ?? ek.subject };
    if (!byKey.has(ek.key)) byKey.set(ek.key, { key: ek.key, kind: ek.kind, members: [] });
    byKey.get(ek.key)!.members.push(withSubject);
  }
  return [...byKey.values()];
}

function weightOf(m: NormalizedMarket): number {
  if (m.source === "txline") return TXLINE_WEIGHT;
  const base = m.liquidity ?? m.volume ?? 0;
  const w = Math.max(base, 1);
  return m.source === "manifold" ? w * PLAY_MONEY_FACTOR : w;
}

// Align every member's probability to one reference subject. For a two-sided fixture,
// a member about the other team is complement-flipped (1 - p). Members whose subject we
// cannot line up with the reference are dropped, so we never compare mismatched outcomes.
export function alignGroup(group: MatchedGroup, referenceSubject?: string): AlignedPoint[] {
  const ref =
    referenceSubject ??
    // default: subject of the highest-weight member
    [...group.members].sort((a, b) => weightOf(b) - weightOf(a))[0]?.subject;

  const subjects = new Set(group.members.map((m) => m.subject).filter(Boolean) as string[]);
  const out: AlignedPoint[] = [];

  for (const m of group.members) {
    let prob: number | undefined;
    if (group.kind === "fixture") {
      if (!m.subject || !ref) prob = undefined;
      else if (m.subject === ref) prob = m.priceYes;
      else if (subjects.size === 2) prob = 1 - m.priceYes; // the other team in a 2-sided fixture
      else prob = undefined;
    } else {
      // outright / generic: only compare identical subjects
      if (ref === undefined || m.subject === ref) prob = m.priceYes;
      else prob = undefined;
    }
    if (prob !== undefined) out.push({ source: m.source, prob, subject: ref, weight: weightOf(m) });
  }
  return out;
}
