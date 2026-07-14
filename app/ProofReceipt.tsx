// app/ProofReceipt.tsx
// Verifiable Resolution UI: fetches the Merkle proof for a TxLINE fixture and
// shows it as a "receipt" — the fixture data, the sub-tree root, and the
// main-tree proof path, all cryptographically anchored on-chain. Pure display
// of real proof data. Lets a user trace a record to the on-chain commitment
// without trusting an external oracle.

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

export default function ProofReceipt({ fixtureId }: { fixtureId?: string }) {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  async function fetchProof() {
    if (!fixtureId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/txline/proof?fixtureId=${fixtureId}`);
      if (!res.ok) throw new Error(`proof unavailable (${res.status})`);
      const d = await res.json();
      setData(d);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed to load proof");
    } finally {
      setLoading(false);
    }
  }

  if (!fixtureId) return null;

  const rootHex = toHex(data?.summary?.updateSubTreeRoot);
  const mainProof = data?.mainTreeProof || [];
  const subProof = data?.subTreeProof || [];
  const updateCount = data?.summary?.updateStats?.updateCount;

  return (
    <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
            verifiable resolution
          </span>
          <span className="font-mono text-[10px] text-zinc-600">
            Merkle proof · Solana devnet
          </span>
        </div>
        {!data && (
          <button
            onClick={fetchProof}
            disabled={loading}
            className="font-mono text-[10px] rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "loading…" : "verify data receipt"}
          </button>
        )}
      </div>

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
            <Row label="competition" value={String(data.summary?.competition ?? "")} />
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
                        title={node.isRightSibling ? "right sibling" : "left sibling"}
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
