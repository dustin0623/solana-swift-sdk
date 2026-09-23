import { useState } from "react";
import { DEFAULT_CONFIG, buildClient, type PlaygroundConfig } from "../../lib/playground-config";

type Result = {
  name: string;
  status: "healthy" | "unhealthy" | "error";
  latencyMs?: number;
  slot?: number;
  version?: string;
  detail?: string;
};

function describeTarget(c: PlaygroundConfig): string {
  if (c.rpcUrl.trim()) return `${c.rpcName.trim() || "Custom RPC"} (${c.network})`;
  if (c.heliusApiKey.trim()) return `Helius (${c.network}, key hidden)`;
  return `Public Solana RPC (${c.network})`;
}

async function check(name: string, c: PlaygroundConfig): Promise<Result> {
  const client = buildClient(c);
  const start = performance.now();
  try {
    const health = await client.rpc.request<string>("getHealth", []).catch((e: unknown) => {
      throw e;
    });
    const latencyMs = Math.round(performance.now() - start);
    const [slot, version] = await Promise.all([
      client.rpc.getSlot().then(Number).catch(() => undefined),
      client.rpc
        .request<{ "solana-core"?: string }>("getVersion", [])
        .then((v) => v["solana-core"])
        .catch(() => undefined),
    ]);
    return { name, status: health === "ok" ? "healthy" : "unhealthy", latencyMs, slot, version, detail: health === "ok" ? undefined : String(health) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const unhealthy = /behind|unhealthy|-32005/i.test(msg);
    return { name, status: unhealthy ? "unhealthy" : "error", latencyMs: Math.round(performance.now() - start), detail: msg };
  }
}

const badge: Record<Result["status"], string> = {
  healthy: "bg-primary/15 text-primary border-primary/40",
  unhealthy: "bg-accent text-accent-foreground border-border",
  error: "bg-destructive/15 text-destructive border-destructive/40",
};

export function RpcHealth({ draft }: { draft: PlaygroundConfig }) {
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResults(null);
    const targets: [string, PlaygroundConfig][] = [
      [`Your configuration — ${describeTarget(draft)}`, draft],
      ["Public default — devnet", { ...DEFAULT_CONFIG, network: "devnet" }],
      ["Public default — mainnet", { ...DEFAULT_CONFIG, network: "mainnet" }],
    ];
    setResults(await Promise.all(targets.map(([n, c]) => check(n, c))));
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">RPC node health</h2>
          <p className="text-xs text-muted-foreground">
            Calls <code>getHealth</code>, <code>getSlot</code> and <code>getVersion</code> on the values in the form
            (saved or not) and on the public default servers. Read-only.
          </p>
        </div>
        <button
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={busy}
          onClick={run}
        >
          {busy ? "Checking…" : "Check health"}
        </button>
      </div>
      {results ? (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.name} className="rounded-md border border-border bg-background p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{r.name}</span>
                <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase ${badge[r.status]}`}>{r.status}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {r.latencyMs !== undefined ? `${r.latencyMs} ms` : ""}
                {r.slot !== undefined ? ` · slot ${r.slot}` : ""}
                {r.version ? ` · solana-core ${r.version}` : ""}
              </div>
              {r.detail ? <div className="mt-1 break-all font-mono text-xs text-destructive">{r.detail}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
