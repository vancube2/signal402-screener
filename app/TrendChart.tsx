// app/TrendChart.tsx
// Session-only aggregate trend. Plots the board's average Yes probability
// over time as snapshots accumulate (one point per refresh). Not per-market,
// not a trade ticker - the pulse of the whole board. Resets on reload.

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type TrendPoint = {
  t: number; // ms timestamp
  avgYes: number; // board-wide average Yes %
  volume: number; // total board volume
};

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function TrendChart({ history }: { history: TrendPoint[] }) {
  // need at least 2 points to draw a line
  if (!history || history.length < 2) {
    return (
      <div className="mt-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">
          board volume · this session
        </div>
        <div className="h-[70px] flex items-center justify-center rounded-md bg-zinc-900/40 font-mono text-[10px] text-zinc-600">
          building… updates every 2 min while open
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">
        board volume · this session
      </div>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer>
          <LineChart
            data={history}
            margin={{ top: 6, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTime}
              stroke="#52525b"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "#71717a" }}
              minTickGap={50}
            />
            <YAxis
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => fmtVol(v as number)}
              stroke="#52525b"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "#71717a" }}
              width={42}
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
              labelFormatter={(v) => fmtTime(v as number)}
              formatter={(v) => [fmtVol(Number(v)), "volume"]}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#f5b301"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
