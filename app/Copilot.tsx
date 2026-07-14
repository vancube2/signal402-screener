// app/Copilot.tsx
// "Ask about this market or event" — analyzes, grounds facts with web search,
// never tips a wager. Calls the server route, which holds the key and the prompt.

"use client";

import { useState } from "react";
import { Market } from "./types";
import { marketToNormalized, categoriesForMarket } from "./lib/enrich/adapt";
import { trustScore } from "./lib/enrich/trust";
import { resolutionInfo } from "./lib/enrich/resolution";

function buildContext(market: Market): string {
  const n = marketToNormalized(market);
  const trust = trustScore({
    source: n.source,
    volume: market.volume || undefined,
    liquidity: market.liquidity || undefined,
  });
  const res = resolutionInfo({ source: n.source, description: market.description });
  const cats = categoriesForMarket(market).map((c) => c.label).join(", ");
  return [
    `Question: ${market.question}`,
    cats ? `Event type: ${cats}` : "",
    `Source: ${market.source} (${market.realMoney ? "real money" : "play money"})`,
    market.yes >= 0 ? `Crowd Yes: ${market.yes}% · No: ${market.no}%` : "",
    market.source === "TxLINE" && market.yes >= 0
      ? "This number is a demargined bookmaker-consensus probability, not a traded market."
      : "",
    market.move !== null ? `24h change: ${market.move} points` : "",
    market.volume ? `Volume: ${market.realMoney ? "$" : "Ṁ"}${Math.round(market.volume)}` : "",
    `Trust score: ${trust.score}/100 (${trust.band})`,
    `Resolves via: ${res.resolver}${res.verifiable ? " (independently verifiable)" : ""}`,
    market.closeDate ? `Closes: ${market.closeDate}` : "",
    market.description ? `Description: ${market.description.slice(0, 900)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function Copilot({ market }: { market: Market }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSport =
    market.source === "TxLINE" || /\bvs\.?\b|world cup|match|fixture/i.test(market.question);
  const suggestions = isSport
    ? [
        "Analyze this matchup",
        "Recent form and head-to-head",
        "What could decide it, and why",
        "What does this probability mean?",
      ]
    : [
        "Analyze this event",
        "What's the background and recent news?",
        "What could happen next, and why?",
        "What does this probability mean?",
      ];

  async function ask(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: buildContext(market), userMessage: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setAnswer(data.answer || "No response.");
      }
    } catch {
      setError("Could not reach the copilot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-zinc-800/60 pt-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
        Ask about this market or event · analyzes, never tips bets
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              setQuestion(s);
              ask(s);
            }}
            disabled={loading}
            className="px-2 py-1 rounded text-[11px] font-mono bg-zinc-800/60 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              ask(question);
            }
          }}
          placeholder="Ask about this market or the event behind it…"
          className="flex-1 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 font-mono text-xs focus:outline-none focus:border-cyan-500/50"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            ask(question);
          }}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs font-mono bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {loading && (
        <p className="mt-2 font-mono text-[10px] text-zinc-600">
          Analyzing{isSport ? " and checking recent results" : ""}…
        </p>
      )}
      {error && <p className="mt-2 font-mono text-xs text-rose-400">{error}</p>}
      {answer && (
        <div className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-900/50 rounded p-3 border border-zinc-800/60">
          {answer}
        </div>
      )}
    </div>
  );
}
