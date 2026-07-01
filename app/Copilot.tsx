// app/Copilot.tsx
// Client copilot: "ask about this market" — calls the server route, which
// holds the key and the explain-not-recommend system prompt.

"use client";

import { useState } from "react";
import { Market } from "./types";

const SUGGESTIONS = [
  "What does this market mean?",
  "What does this probability tell me?",
  "Why might the price be where it is?",
];

export default function Copilot({ market }: { market: Market }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const marketContext = [
        `Question: ${market.question}`,
        `Source: ${market.source} (${market.realMoney ? "real money" : "play money"})`,
        market.yes >= 0 ? `Crowd Yes: ${market.yes}%` : "",
        market.move !== null ? `24h change: ${market.move} points` : "",
        market.description ? `Description: ${market.description.slice(0, 800)}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: marketContext, userMessage: text }),
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
        Ask about this market · explains, does not advise
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              setQuestion(s);
              ask(s);
            }}
            disabled={loading}
            className="px-2 py-1 rounded text-[11px] font-mono bg-zinc-800/60 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 disabled:opacity-50"
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
          placeholder="Ask a question about this market…"
          className="flex-1 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 font-mono text-xs focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            ask(question);
          }}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs font-mono bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {error && (
        <p className="mt-2 font-mono text-xs text-rose-400">{error}</p>
      )}
      {answer && (
        <div className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-900/50 rounded p-3 border border-zinc-800/60">
          {answer}
        </div>
      )}
    </div>
  );
}
