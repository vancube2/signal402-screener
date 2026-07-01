// app/PriceChart.tsx
// Yes-price history chart for a Polymarket market. Client-side (recharts).
// Fetches from /api/history on expand. Shows nothing gracefully if no data.

"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = { t: number; yes: number };

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PriceChart({ tokenId }: { tokenId?: string }) {
  const [series, setSeries] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/history?token=${encodeURIComponent(tokenId)}&interval=1w`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const s = Array.isArray(d.series) ? d.series : [];
        setSeries(s);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  if (!tokenId) return null;

  return (
    <div className="mt-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
        Yes price · last 7 days
      </div>

      {loading && (
        <div className="h-[140px] flex items-center justify-center font-mono text-xs text-zinc-600">
          loading chart…
        </div>
      )}

      {!loading && (failed || !series || series.length < 2) && (
        <div className="h-[80px] flex items-center justify-center font-mono text-xs text-zinc-600">
          No price history available for this market.
        </div>
      )}

      {!loading && series && series.length >= 2 && (
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart
              data={series}
              margin={{ top: 6, right: 10, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={fmtDate}
                stroke="#52525b"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: "#71717a" }}
                minTickGap={40}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="#52525b"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: "#71717a" }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#f5b301" }}
                labelFormatter={(v) => fmtDate(v as number)}
                formatter={(v) => [`${Number(v)}%`, "Yes"]}
              />
              <Line
                type="monotone"
                dataKey="yes"
                stroke="#f5b301"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
