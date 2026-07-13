import type { Category, CategoryId, NormalizedMarket } from "./types";

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  sports: "Sports",
  politics: "Politics",
  crypto: "Crypto",
  economy: "Economy",
  weather: "Weather & Climate",
  culture: "Culture & Trends",
  science_tech: "Science & Tech",
  business: "Business",
  world: "World",
};

// Keyword rules. Each hit adds the category and records the matched tag.
// Order does not matter; a market can match several categories.
type Rule = { cat: CategoryId; tag: string; kws: string[] };

const RULES: Rule[] = [
  // sports
  { cat: "sports", tag: "football", kws: ["world cup", "fifa", "premier league", "la liga", "uefa", "champions league", "ballon d'or", " vs ", "match", "fixture"] },
  { cat: "sports", tag: "basketball", kws: ["nba", "playoffs", "finals mvp"] },
  { cat: "sports", tag: "tennis", kws: ["wimbledon", "us open", "roland garros", "atp", "wta"] },
  { cat: "sports", tag: "combat", kws: ["ufc", "boxing", "mma"] },
  { cat: "sports", tag: "motorsport", kws: ["formula 1", "grand prix", "f1"] },
  { cat: "sports", tag: "general", kws: ["olympics", "super bowl", "championship", "medal"] },
  // politics
  { cat: "politics", tag: "elections", kws: ["election", "president", "presidential", "primary", "senate", "governor", "parliament", "prime minister", "nomination", "vote", "referendum"] },
  { cat: "politics", tag: "appointments", kws: ["cabinet", "resign", "appointed", "confirmed", "impeach"] },
  { cat: "politics", tag: "geopolitics", kws: ["sanction", "treaty", "summit", "coup"] },
  // crypto
  { cat: "crypto", tag: "price", kws: ["bitcoin", "btc", "ethereum", "eth", "solana", "sol", "$sol", "token", "all-time high", "ath"] },
  { cat: "crypto", tag: "product", kws: ["etf", "halving", "airdrop", "mainnet", "hard fork", "stablecoin"] },
  // economy
  { cat: "economy", tag: "rates", kws: ["fed", "interest rate", "rate cut", "rate hike", "fomc", "ecb"] },
  { cat: "economy", tag: "inflation", kws: ["inflation", "cpi", "recession", "gdp"] },
  { cat: "economy", tag: "jobs", kws: ["unemployment", "jobs report", "payrolls"] },
  // weather / climate
  { cat: "weather", tag: "climate", kws: ["hottest", "temperature", "el nino", "la nina", "climate"] },
  { cat: "weather", tag: "events", kws: ["hurricane", "storm", "snow", "rainfall", "wildfire"] },
  // culture / trends
  { cat: "culture", tag: "awards", kws: ["oscars", "grammy", "emmy", "nobel", "time person of the year"] },
  { cat: "culture", tag: "entertainment", kws: ["box office", "album", "billboard", "netflix", "movie", "taylor swift"] },
  { cat: "culture", tag: "internet", kws: ["twitter", " x ", "tiktok", "meme", "trend"] },
  // science / tech
  { cat: "science_tech", tag: "ai", kws: ["gpt", "openai", "anthropic", "llm", "agi", "model release"] },
  { cat: "science_tech", tag: "space", kws: ["spacex", "nasa", "rocket", "launch", "asteroid", "mars"] },
  { cat: "science_tech", tag: "research", kws: ["fda", "vaccine", "fusion", "quantum"] },
  // business
  { cat: "business", tag: "earnings", kws: ["earnings", "revenue", "quarterly", "ipo"] },
  { cat: "business", tag: "deals", kws: ["acquire", "acquisition", "merger", "layoffs", "ceo"] },
  { cat: "business", tag: "markets", kws: ["s&p 500", "nasdaq", "dow", "stock"] },
];

// Map a source-provided tag onto our taxonomy where the wording differs.
const SOURCE_TAG_MAP: Record<string, { cat: CategoryId; tag: string }> = {
  sports: { cat: "sports", tag: "general" },
  soccer: { cat: "sports", tag: "football" },
  football: { cat: "sports", tag: "football" },
  politics: { cat: "politics", tag: "elections" },
  economics: { cat: "economy", tag: "rates" },
  crypto: { cat: "crypto", tag: "price" },
  science: { cat: "science_tech", tag: "research" },
  technology: { cat: "science_tech", tag: "ai" },
  culture: { cat: "culture", tag: "entertainment" },
  business: { cat: "business", tag: "markets" },
  weather: { cat: "weather", tag: "climate" },
  worldcup: { cat: "sports", tag: "football" },
};

// A single alphanumeric token (eth, sol, nba) must match on a word boundary so it
// does not fire inside a larger word ("eth" in "something"). Phrases or keywords
// with a space/symbol ("world cup", "$sol", " vs ") match as a literal substring.
function matches(hay: string, kw: string): boolean {
  if (/[^a-z0-9]/.test(kw)) return hay.includes(kw);
  return new RegExp(`\\b${kw}\\b`).test(hay);
}

export function categorize(m: Pick<NormalizedMarket, "question" | "description" | "sourceTags" | "source">): Category[] {
  const hay = `${m.question ?? ""} ${m.description ?? ""}`.toLowerCase();
  const acc = new Map<CategoryId, Set<string>>();

  const add = (cat: CategoryId, tag: string) => {
    if (!acc.has(cat)) acc.set(cat, new Set());
    acc.get(cat)!.add(tag);
  };

  for (const r of RULES) {
    if (r.kws.some((k) => matches(hay, k))) add(r.cat, r.tag);
  }

  for (const raw of m.sourceTags ?? []) {
    const hit = SOURCE_TAG_MAP[raw.toLowerCase().replace(/\s+/g, "")];
    if (hit) add(hit.cat, hit.tag);
  }

  // TxLINE is a World Cup feed today, so anything from it is football at minimum.
  if (m.source === "txline") add("sports", "football");

  // Nothing matched: bucket into "world" so it is still browsable, never dropped.
  if (acc.size === 0) add("world", "general");

  return [...acc.entries()].map(([id, tags]) => ({
    id,
    label: CATEGORY_LABELS[id],
    tags: [...tags],
  }));
}
