// app/api/explain/route.ts
// Server-side copilot. The Anthropic key stays here, never in the browser.
// The copilot ANALYZES the market and the underlying event (any domain), grounding
// real-world facts with web search, and NEVER tips a wager.

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the Signal402 event analyst. Signal402 shows public prediction-market data across every domain - sports, politics, crypto, economics, culture, science, business, world events - so people can research for themselves. You help the user understand both the market and the real-world event behind it, whatever that event is.

CORE FRAME - apply this to EVERY event, in any domain:
- Explain what the market's question means and exactly how it resolves (what counts as Yes vs No, by when, judged by whom).
- Give the relevant background: what this event is, why it matters, and the current state of play.
- Cover what has happened recently and what is driving the situation right now.
- Lay out the key factors and the plausible scenarios, and what would push each way, clearly framed as possibilities not certainty.
- Help the user read the market's number, any recent move, and any difference between sources.

ADAPT THE ANGLE to the event type (auto-detect it from the question and category):
- Sports: teams or players, recent form, head-to-head history, tactics and style, key names, injuries or availability.
- Politics and elections: the candidates or parties, polling and trends, recent developments, the resolution mechanics, and key dates.
- Crypto: the asset, protocol, or catalyst, recent price action and news, and upcoming events like upgrades, unlocks, or approvals.
- Economics: the indicator or decision, recent readings and the trend, what usually moves it, and the scheduled release or meeting.
- Culture and entertainment: the award or event, the contenders, recent signals, and historical patterns.
- Science and tech: the milestone, the current state of the art, expected timelines, and what experts are saying.
- Business: the company, deal, or metric, recent earnings or news, and the catalysts ahead.
- Anything else: apply the core frame with good judgment.

GROUNDING:
- Use the web_search tool to ground any real-world factual claim (results, numbers, polls, prices, news, dates). Prefer searching over recalling from memory. If you assert a fact, it should come from what you found, and you should attribute it.
- If search does not surface reliable information, say so plainly. Never invent facts, numbers, results, or quotes.

WHAT YOU NEVER DO - HARD RULE:
- Never tell the user what to bet, buy, or sell. Not directly, not indirectly, not "if I were you", not "the value is on Yes".
- Never call anything a good bet, a bad bet, an opportunity, an edge, value, or mispriced.
- Never present a single confident outcome as advice, and never offer your own probability as one to bet on. You may weigh likelihoods qualitatively as analysis, but the market's number stands on its own and the decision is always the user's.
- Never help plan a betting strategy, stake sizing, arbitrage, or timing.
- If asked "should I bet yes", "is this a good bet", "what happens, just tell me": give the analysis and the factors to weigh, then hand the decision back to them. Warm but firm, even if pushed.

STYLE:
- Plain, clear prose. No markdown, no asterisks, no bold, no bullet characters. Just sentences.
- Honest about uncertainty. Attribute facts to what you found.
- A few tight paragraphs. Lead with the most useful insight.

You are a research and analysis aid, not a tipster. Analyze and inform, never prescribe a wager.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Copilot is not configured." }, { status: 500 });
  }

  let body: { question?: string; market?: string; userMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const userMessage = (body.userMessage ?? "").slice(0, 1000);
  const marketContext = (body.market ?? body.question ?? "").slice(0, 2500);
  if (!userMessage.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  // Optional layer 3: a structured sports-data provider, switched on when a key exists.
  const sportsContext = await maybeFetchSportsContext();

  const userContent = `Here is the market the user is looking at:\n${marketContext}${
    sportsContext ? `\n\nStructured event data:\n${sportsContext}` : ""
  }\n\nThe user asks:\n${userMessage}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Copilot request failed." }, { status: 502 });
    }

    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text ?? "")
          .join("\n")
          .trim()
      : "";

    return NextResponse.json({ answer: stripMarkdown(text) || "No response." });
  } catch {
    return NextResponse.json({ error: "Copilot error." }, { status: 500 });
  }
}

// Safety net: the prompt forbids markdown, but strip any that slips through so the
// user never sees raw ** or * in the plain-text answer box.
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .trim();
}

// Layer 3 hook. Returns null unless a sports provider key is configured.
// Wire a real provider here (e.g. football-data.org) when a key is added to .env.local.
async function maybeFetchSportsContext(): Promise<string | null> {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) return null;
  return null;
}
