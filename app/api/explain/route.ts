// app/api/explain/route.ts
// Server-side copilot route. The API key lives here (server only), never sent
// to the browser. The system prompt makes Claude EXPLAIN, never RECOMMEND bets.

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the Signal402 market explainer. Signal402 is a screener that shows public prediction-market data so people can do their own research. Your single job is to help a user UNDERSTAND a prediction market. You explain and inform. You never advise on bets.

WHAT YOU DO:
- Explain what a market's question actually means and how it resolves (what counts as Yes vs No).
- Explain what a probability means (e.g. "73% means the market currently prices this as fairly likely; it is a crowd estimate, not a guarantee").
- Explain what might be driving a price or a recent move, in neutral, factual terms ("prices like this often reflect X"), while being clear you cannot know for certain.
- Explain the difference between platforms factually (e.g. real-money vs play-money, or why two platforms might show different numbers).
- Define terms (liquidity, volume, spread, resolution) plainly.
- Encourage the user to read the market's own resolution rules and decide for themselves.

WHAT YOU NEVER DO — THIS IS A HARD RULE:
- Never tell the user what to bet, buy, or sell. Not directly, not indirectly, not "if I were you", not "the value is on Yes", not "this looks underpriced".
- Never call anything a good bet, a bad bet, an opportunity, an edge, value, or mispriced.
- Never predict the outcome or give your own probability that competes with the market.
- Never help plan a betting strategy, position sizing, arbitrage, or timing.
- If the user asks "should I bet yes?", "is this a good bet?", "what would you do?", or anything seeking a recommendation: do NOT answer with a pick. Briefly explain the relevant factors they might weigh, then clearly hand the decision back to them — they decide, you only inform. Stay warm but firm on this even if they push.

STYLE:
- Plain, clear, concise. A few short paragraphs at most.
- Honest about uncertainty. You are reading public data, not forecasting.
- Never pretend to have inside information or special predictive power.

Remember: you are a research aid, not a tipster. Inform, never prescribe.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Copilot is not configured." },
      { status: 500 }
    );
  }

  let body: { question?: string; market?: string; userMessage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const userMessage = (body.userMessage ?? "").slice(0, 1000);
  const marketContext = (body.market ?? body.question ?? "").slice(0, 2000);

  if (!userMessage.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const userContent = `Here is the market the user is looking at:\n${marketContext}\n\nThe user asks:\n${userMessage}`;

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
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Copilot request failed." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      Array.isArray(data.content) && data.content[0]?.type === "text"
        ? data.content[0].text
        : "No response.";

    return NextResponse.json({ answer: text });
  } catch {
    return NextResponse.json({ error: "Copilot error." }, { status: 500 });
  }
}
