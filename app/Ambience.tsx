// app/Ambience.tsx
// Signal402 "Intelligence Pulse" ambient animation.
// A quiet constellation of nodes connected by faint links. Emerald pulses travel
// along the links every few seconds, and nodes occasionally glow brighter to
// signal a verified event arriving through the feed. Bloomberg, not ESPN:
// slow, intentional, premium. Pure SVG + CSS keyframes, GPU-friendly (transform
// and opacity only), no JS animation loop. Respects prefers-reduced-motion.

"use client";

import { Market } from "./types";

// brand palette: emerald-forward to match the hero identity
const EM = "#34d399"; // emerald
const EM2 = "#6ee7b7"; // light emerald
const DIM = "#134e4a"; // deep teal for faint links

// A fixed constellation. Coordinates in a 400x200 viewBox.
// Nodes chosen to feel like an intelligence network, not a literal map.
const NODES: { x: number; y: number; r: number }[] = [
  { x: 40, y: 60, r: 2.4 },
  { x: 95, y: 118, r: 2.0 },
  { x: 130, y: 42, r: 2.6 },
  { x: 186, y: 96, r: 3.0 },
  { x: 232, y: 40, r: 2.2 },
  { x: 250, y: 140, r: 2.4 },
  { x: 305, y: 84, r: 2.8 },
  { x: 348, y: 150, r: 2.0 },
  { x: 360, y: 52, r: 2.4 },
];

// Links between node indices. Each pulse animates along one link.
const LINKS: [number, number][] = [
  [0, 2],
  [0, 1],
  [1, 3],
  [2, 3],
  [3, 4],
  [3, 5],
  [4, 6],
  [5, 6],
  [6, 8],
  [6, 7],
  [5, 7],
];

const KEYFRAMES = `
@keyframes s402pulse{
  0%{offset-distance:0%;opacity:0}
  10%{opacity:1}
  85%{opacity:1}
  100%{offset-distance:100%;opacity:0}
}
@keyframes s402pulseFallback{
  0%{opacity:0;transform:scale(.6)}
  15%{opacity:1;transform:scale(1)}
  85%{opacity:1}
  100%{opacity:0;transform:scale(.6)}
}
@keyframes s402node{
  0%,100%{opacity:.35;r:var(--r)}
  50%{opacity:.7}
}
@keyframes s402verify{
  0%,88%,100%{opacity:0;transform:scale(.5)}
  92%{opacity:.9;transform:scale(1)}
  96%{opacity:.5;transform:scale(1.6)}
}
@keyframes s402drift{
  0%,100%{transform:translate(0,0);opacity:.55}
  50%{transform:translate(3%,-2%);opacity:.9}
}
@keyframes s402heartbeat{
  0%,100%{opacity:.5;box-shadow:0 0 0 0 rgba(52,211,153,0)}
  50%{opacity:1;box-shadow:0 0 8px 1px rgba(52,211,153,.55)}
}
@keyframes s402rise{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  .s402-anim{animation:none!important}
  .s402-pulse{opacity:0!important}
}
`;

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function PulseNetwork({ dur, dim }: { dur: number; dim: number }) {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className="w-full h-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="s402pg">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={EM2} />
          <stop offset="100%" stopColor={EM} />
        </radialGradient>
        <radialGradient id="s402vg">
          <stop offset="0%" stopColor={EM2} stopOpacity="0.9" />
          <stop offset="100%" stopColor={EM} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g opacity={dim}>
        {/* faint links */}
        {LINKS.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          return (
            <line
              key={`l${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke={DIM}
              strokeWidth="0.6"
              opacity="0.5"
            />
          );
        })}

        {/* nodes, gently breathing */}
        {NODES.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={EM}
            className="s402-anim"
            style={
              {
                // @ts-expect-error CSS custom property
                "--r": `${n.r}px`,
                transformOrigin: `${n.x}px ${n.y}px`,
                animation: `s402node ${6 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* verified-event glows on a few key nodes */}
        {[3, 6, 5].map((idx, k) => {
          const n = NODES[idx];
          return (
            <circle
              key={`v${k}`}
              cx={n.x}
              cy={n.y}
              r="10"
              fill="url(#s402vg)"
              className="s402-anim"
              style={{
                transformOrigin: `${n.x}px ${n.y}px`,
                animation: `s402verify ${dur * (2.4 + k * 0.7)}s ease-in-out ${
                  k * 2.3
                }s infinite`,
              }}
            />
          );
        })}

        {/* travelling pulses: one per link, staggered. offset-path where supported,
            a soft fade at the link midpoint as a graceful fallback. */}
        {LINKS.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          const mid = midpoint(na, nb);
          const path = `path("M ${na.x} ${na.y} L ${nb.x} ${nb.y}")`;
          const delay = (i * dur) / LINKS.length;
          return (
            <g key={`p${i}`}>
              <circle
                className="s402-anim s402-pulse"
                r="1.8"
                fill="url(#s402pg)"
                style={{
                  // @ts-expect-error offsetPath is valid CSS
                  offsetPath: path,
                  offsetRotate: "0deg",
                  animation: `s402pulse ${dur}s linear ${delay}s infinite`,
                }}
              />
              {/* fallback dot pulsing at the midpoint for engines without offset-path */}
              <circle
                cx={mid.x}
                cy={mid.y}
                r="1.4"
                fill={EM2}
                className="s402-anim s402-pulse"
                style={{
                  transformOrigin: `${mid.x}px ${mid.y}px`,
                  animation: `s402pulseFallback ${dur}s ease-in-out ${delay}s infinite`,
                  opacity: 0,
                }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 overflow-hidden pointer-events-none"
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {/* soft ambient glows drifting slowly */}
      <div
        className="s402-anim absolute -top-[18%] left-[12%] w-[52vw] h-[52vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle,rgba(52,211,153,.05),transparent 62%)",
          animation: "s402drift 40s ease-in-out infinite",
        }}
      />
      <div
        className="s402-anim absolute top-[38%] -right-[10%] w-[44vw] h-[44vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle,rgba(16,185,129,.05),transparent 62%)",
          animation: "s402drift 52s ease-in-out infinite reverse",
        }}
      />
      {/* the intelligence network, faint behind the whole page */}
      <div className="absolute inset-0 opacity-[0.28]">
        <PulseNetwork dur={7} dim={1} />
      </div>
    </div>
  );
}

export function Hero({ markets }: { markets: Market[] }) {
  const wc = markets.filter(
    (m) => m.source === "TxLINE" && m.home && m.away
  ).length;
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-[#04120c] via-[#061a12] to-black">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {/* the pulse network on the right, brighter than the page backdrop */}
      <div className="absolute inset-y-0 right-0 w-[62%] pointer-events-none opacity-25">
        <PulseNetwork dur={5} dim={1} />
      </div>
      <div
        className="absolute -top-1/2 left-1/4 w-[36vw] h-[36vw] rounded-full pointer-events-none s402-anim"
        style={{
          background:
            "radial-gradient(circle,rgba(52,211,153,.12),transparent 60%)",
          animation: "s402drift 24s ease-in-out infinite",
        }}
      />

      <div className="relative px-5 py-6 sm:py-7 max-w-[60%]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10">
          <span
            className="s402-anim w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "s402drift 1.8s ease-in-out infinite" }}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">
            Trending now
          </span>
        </span>
        <h2 className="mt-2.5 text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 via-emerald-300 to-teal-500">
          World Cup 2026
        </h2>
        <p className="mt-1.5 font-mono text-xs text-zinc-400">
          Live prediction intelligence
          {wc > 0 ? ` · ${wc} match markets` : ""} · verifiable on-chain
        </p>
      </div>
    </div>
  );
}
