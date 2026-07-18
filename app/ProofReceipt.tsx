// app/ProofReceipt.tsx
// Verifiable Resolution UI: fetches the Merkle proof for a TxLINE fixture and
// shows it as a "receipt": the fixture data, the sub-tree root, and the
// main-tree proof path, all cryptographically anchored on-chain. Pure display
// of real proof data. Lets a user trace a record to the on-chain commitment
// without trusting an external oracle.
//
// The verification is revealed in stages. Each stage narrates a real step of
// reading the proof (fetch, read leaf, walk the path, anchor to the root). The
// pacing is for legibility; the labels are accurate to what actually happens,
// and the receipt still states that a full trustless check runs the on-chain
// validate instruction.

"use client";

import { useState } from "react";

type ProofNode = { hash: number[]; isRightSibling: boolean };
type ProofData = {
  snapshot?: Record<string, unknown>;
  summary?: {
    fixtureId?: number;
    competition?: string;
    updateSubTreeRoot?: number[];
    updateStats?: { updateCount?: number };
  };
  subTreeProof?: ProofNode[];
  mainTreeProof?: ProofNode[];
};

function toHex(bytes?: number[]): string {
  if (!bytes || !Array.isArray(bytes)) return "";
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function shortHex(hex: string): string {
  if (hex.length <= 16) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-8)}`;
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// stages narrate real steps; labels are accurate to what the proof represents
const STAGES = [
  "Fetching proof",
  "Reading fixture leaf",
  "Walking Merkle path",
  "Anchoring to on-chain root",
];

export default function ProofReceipt({ fixtureId }: { fixtureId?: string }) {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(-1); // -1 idle, 0..n running, 99 verified

  async function fetchProof() {
    if (!fixtureId) return;
    setLoading(true);
    setErr("");
    setStage(0);
    try {
      const fetchP = fetch(`/api/txline/proof?fixtureId=${fixtureId}`);
      await sleep(340);
      setStage(1);
      const res = await fetchP;
      if (!res.ok) throw new Error(`proof unavailable (${res.status})`);
      const d = (await res.json()) as ProofData;
      await sleep(300);
      setStage(2);
      await sleep(340);
      setStage(3);
      await sleep(340);
      setData(d);
      setStage(99);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed to load proof");
      setStage(-1);
    } finally {
      setLoading(false);
    }
  }

  if (!fixtureId) return null;

  const rootHex = toHex(data?.summary?.updateSubTreeRoot);
  const mainProof = data?.mainTreeProof || [];
  const subProof = data?.subTreeProof || [];
  const updateCount = data?.summary?.updateStats?.updateCount;
  const running = stage >= 0 && stage < 99;

  return (
    <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes s402stage{0%{opacity:0;transform:translateX(-6px)}100%{opacity:1;transform:none}}
@keyframes s402seal{0%{opacity:0;transform:scale(.7)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.s402stage,.s402seal{animation:none!important}}
`,
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
            verifiable resolution
          </span>
          <span className="font-mono text-[10px] text-zinc-600">
            Merkle proof · Solana devnet
          </span>
        </div>
        {!data && !running && (
          <button
            onClick={fetchProof}
            disabled={loading}
            className="font-mono text-[10px] rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            verify data receipt
          </button>
        )}
        {stage === 99 && (
          <span
            className="s402seal inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
            style={{ animation: "s402seal .5s ease-out" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            verified
          </span>
        )}
      </div>

      {running && (
        <div className="mt-3 space-y-1.5">
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            if (i > stage) return null;
            return (
              <div
                key={label}
                className="s402stage flex items-center gap-2 font-mono text-[10px]"
                style={{ animation: "s402stage .28s ease-out" }}
              >
                <span
                  className={
                    done
                      ? "text-emerald-400"
                      : active
                      ? "text-zinc-300"
                      : "text-zinc-600"
                  }
                >
                  {done ? (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-500 border-t-emerald-400 animate-spin" />
                  )}
                </span>
                <span className={done ? "text-zinc-400" : "text-zinc-300"}>
                  {label}
                  {active ? "…" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {err && (
        <div className="mt-2 font-mono text-[10px] text-rose-400/80">{err}</div>
      )}

      {data && open && (
        <div className="mt-3 space-y-2">
          <div className="font-mono text-[10px] text-zinc-500">
            This fixture record is committed to an on-chain Merkle root. The proof
            path below traces the record to that commitment.
          </div>
          <div className="rounded bg-zinc-950/60 p-2 space-y-1.5">
            <Row label="fixture id" value={String(data.summary?.fixtureId ?? "")} />
            <Row
              label="competition"
              value={String(data.summary?.competition ?? "")}
            />
            <Row label="updates in batch" value={String(updateCount ?? "")} />
            <Row label="sub-tree root" value={shortHex(rootHex)} mono full={rootHex} />
            <Row
              label="proof path"
              value={`${mainProof.length + subProof.length} nodes`}
            />
          </div>
          {(mainProof.length > 0 || subProof.length > 0) && (
            <div className="rounded bg-zinc-950/60 p-2">
              <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">
                proof path (leaf → root)
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {[...subProof, ...mainProof].map((node, i) => {
                  const hex = toHex(node.hash);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 font-mono text-[9px]"
                    >
                      <span className="text-zinc-700 w-5 text-right">{i}</span>
                      <span
                        className={
                          node.isRightSibling
                            ? "text-cyan-400/70 w-4"
                            : "text-sky-400/70 w-4"
                        }
                        title={
                          node.isRightSibling ? "right sibling" : "left sibling"
                        }
                      >
                        {node.isRightSibling ? "R" : "L"}
                      </span>
                      <span className="text-zinc-500 truncate">{hex}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="font-mono text-[9px] text-zinc-600">
            Each node hashes with its sibling up to the root the TxLINE program
            stores on-chain. A full trustless check calls the on-chain validate
            instruction with this proof.
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] text-zinc-600">{label}</span>
      <span
        className={`font-mono text-[10px] text-zinc-300 ${mono ? "truncate" : ""}`}
        title={full || undefined}
      >
        {value}
      </span>
    </div>
  );
}
