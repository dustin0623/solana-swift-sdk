import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Radio } from "lucide-react";
import type { BeaconNode } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage } from "@/lib/error-format";

/** Beacon-backed picker listing the top working public Hive RPC nodes. */
export function NodePicker() {
  const { hive, endpoint, setEndpoint } = useHive();
  const [nodes, setNodes] = useState<BeaconNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNodes(await hive.beacon.getHealthyNodes({ limit: 10 }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [hive]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Radio className="size-4 text-muted-foreground" />
            Public nodes (Beacon)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Top working endpoints from <code>beacon.peakd.com</code>. Select one, or keep your own
            custom endpoint above.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/50 px-3 py-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {loading && nodes.length === 0 && (
          <li className="font-mono text-xs text-muted-foreground">Loading nodes…</li>
        )}
        {nodes.map((node) => {
          const active = node.endpoint === endpoint;
          return (
            <li key={node.endpoint}>
              <button
                onClick={() => setEndpoint(node.endpoint)}
                className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-accent/60 bg-accent/5"
                    : "border-border hover:border-accent/40 hover:bg-muted/30"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm text-foreground">
                    {node.name}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    v{node.version} · block {node.lastBlock?.toLocaleString("en-US") ?? "—"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                    node.score >= 90
                      ? "border-success/40 text-success"
                      : node.score >= 50
                        ? "border-warning/40 text-warning"
                        : "border-destructive/50 text-destructive"
                  }`}
                >
                  {active ? "active" : `score ${node.score}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
