// app/Ambience.tsx
// Original, copyright-safe "striker scores" animation in the Signal402 brand palette.
// A stylized silhouette strikes, the ball arcs into the net, the net ripples and flares.
// Bold in the hero, faint and slow behind the whole page. Pure SVG + CSS. No footage,
// no real players, no external assets. Respects prefers-reduced-motion.

"use client";

import { Market } from "./types";

// brand colors sampled from the logo
const CY = "#22d3ee"; // bright cyan
const CY2 = "#54cce4";
const BL = "#0078d8"; // electric blue

const KEYFRAMES = `
@keyframes s402ball{
  0%,30%{transform:translate(0px,0px);opacity:1}
  48%{transform:translate(115px,-78px);opacity:1}
  64%{transform:translate(200px,-46px);opacity:1}
  70%{transform:translate(229px,-30px);opacity:1}
  74%{transform:translate(229px,-30px);opacity:0}
  74.5%,100%{transform:translate(0px,0px);opacity:0}
}
@keyframes s402leg{
  0%{transform:rotate(16deg)}
  26%{transform:rotate(20deg)}
  36%{transform:rotate(-26deg)}
  52%,100%{transform:rotate(6deg)}
}
@keyframes s402net{
  0%,70%{transform:scale(1);opacity:.45}
  74%{transform:scale(1.14);opacity:1}
  84%,100%{transform:scale(1);opacity:.45}
}
@keyframes s402flare{
  0%,70%{opacity:0;transform:scale(.4)}
  74%{opacity:1;transform:scale(1)}
  88%,100%{opacity:0;transform:scale(1.3)}
}
@keyframes s402streak{
  0%,34%{opacity:0}
  46%{opacity:.8}
  70%{opacity:0}
  100%{opacity:0}
}
@keyframes s402glow{0%,100%{transform:translate(0,0);opacity:.6}50%{transform:translate(4%,-3%);opacity:1}}
@media (prefers-reduced-motion: reduce){.s402-anim{animation:none!important}}
`;

function StrikerScene({ dur, dim }: { dur: number; dim: number }) {
  const line = { stroke: "url(#s402grad)", strokeWidth: 7, strokeLinecap: "round" as const, fill: "none" };
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="s402grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={CY} />
          <stop offset="100%" stopColor={BL} />
        </linearGradient>
        <radialGradient id="s402ballg">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="55%" stopColor={CY2} />
          <stop offset="100%" stopColor={BL} />
        </radialGradient>
      </defs>

      <g opacity={dim}>
        {/* ground */}
        <line x1="20" y1="162" x2="392" y2="162" stroke={CY} strokeWidth="1" opacity="0.25" />

        {/* goal + net (right) */}
        <g style={{ transformOrigin: "364px 128px", transformBox: "view-box" as unknown as undefined }}
           className="s402-anim" >
          <g className="s402-anim" style={{ transformOrigin: "364px 128px", animation: `s402net ${dur}s ease-in-out infinite` }}>
            <rect x="338" y="96" width="52" height="66" fill="none" stroke={CY} strokeWidth="2" opacity="0.5" />
            {[104, 116, 128, 140, 152].map((y) => (
              <line key={y} x1="338" y1={y} x2="390" y2={y} stroke={CY} strokeWidth="0.6" opacity="0.35" />
            ))}
            {[350, 364, 378].map((x) => (
              <line key={x} x1={x} y1="96" x2={x} y2="162" stroke={CY} strokeWidth="0.6" opacity="0.35" />
            ))}
          </g>
          {/* goal flare */}
          <circle cx="364" cy="122" r="20" fill="url(#s402ballg)" opacity="0"
                  className="s402-anim" style={{ transformOrigin: "364px 122px", animation: `s402flare ${dur}s ease-in-out infinite` }} />
        </g>

        {/* speed streaks */}
        <g className="s402-anim" style={{ animation: `s402streak ${dur}s ease-in-out infinite` }} stroke={CY2} strokeWidth="2" strokeLinecap="round" opacity="0">
          <line x1="180" y1="96" x2="205" y2="92" />
          <line x1="150" y1="112" x2="178" y2="108" />
        </g>

        {/* player (stylized silhouette, mid-kick) */}
        <g>
          <line x1="108" y1="108" x2="98" y2="162" {...line} />{/* standing leg */}
          <line x1="108" y1="108" x2="100" y2="74" {...line} />{/* torso */}
          <circle cx="98" cy="66" r="7" fill={CY} />{/* head */}
          <line x1="100" y1="80" x2="78" y2="96" {...line} strokeWidth={5} />{/* back arm */}
          <line x1="100" y1="80" x2="122" y2="86" {...line} strokeWidth={5} />{/* front arm */}
          {/* kicking leg, swings */}
          <line x1="108" y1="108" x2="150" y2="120" {...line}
                className="s402-anim"
                style={{ transformOrigin: "108px 108px", transformBox: "view-box" as unknown as undefined, animation: `s402leg ${dur}s ease-in-out infinite` }} />
        </g>

        {/* ball */}
        <g className="s402-anim" style={{ animation: `s402ball ${dur}s ease-in-out infinite` }}>
          <circle cx="140" cy="150" r="7" fill="url(#s402ballg)" />
          <circle cx="140" cy="150" r="12" fill={CY} opacity="0.18" />
        </g>
      </g>
    </svg>
  );
}

export function AmbientBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div className="s402-anim absolute -top-[18%] left-[14%] w-[52vw] h-[52vw] rounded-full"
           style={{ background: "radial-gradient(circle,rgba(34,211,238,.05),transparent 62%)", animation: "s402glow 34s ease-in-out infinite" }} />
      <div className="s402-anim absolute top-[36%] -right-[10%] w-[44vw] h-[44vw] rounded-full"
           style={{ background: "radial-gradient(circle,rgba(0,120,216,.05),transparent 62%)", animation: "s402glow 46s ease-in-out infinite reverse" }} />
      <div className="absolute inset-0 opacity-[0.06]">
        <StrikerScene dur={7} dim={1} />
      </div>
    </div>
  );
}

export function Hero({ markets }: { markets: Market[] }) {
  const wc = markets.filter((m) => m.source === "TxLINE" && m.home && m.away).length;
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-cyan-500/25 bg-gradient-to-br from-[#040a12] via-[#06121e] to-black">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {/* animation on the right, text on the left */}
      <div className="absolute inset-y-0 right-0 w-[62%] pointer-events-none opacity-70">
        <StrikerScene dur={4.5} dim={1} />
      </div>
      <div className="absolute -top-1/2 left-1/4 w-[36vw] h-[36vw] rounded-full pointer-events-none s402-anim"
           style={{ background: "radial-gradient(circle,rgba(34,211,238,.14),transparent 60%)", animation: "s402glow 22s ease-in-out infinite" }} />

      <div className="relative px-5 py-6 sm:py-7 max-w-[60%]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/10">
          <span className="s402-anim w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ animation: "s402glow 1.8s ease-in-out infinite" }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">Trending now</span>
        </span>
        <h2 className="mt-2.5 text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-cyan-300 to-blue-500">
          World Cup 2026
        </h2>
        <p className="mt-1.5 font-mono text-xs text-zinc-400">
          Live prediction intelligence{wc > 0 ? ` · ${wc} match markets` : ""} · verifiable on-chain
        </p>
      </div>
    </div>
  );
}
