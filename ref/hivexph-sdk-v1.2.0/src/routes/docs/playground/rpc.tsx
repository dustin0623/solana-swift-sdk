import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Terminal } from "lucide-react";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/rpc")({
  head: () => ({
    meta: [
      { title: "Raw RPC — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Send arbitrary JSON-RPC 2.0 requests to any Hive or Beacon-compatible endpoint through the SDK RpcClient.",
      },
      { property: "og:title", content: "Raw RPC — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Debug Hive JSON-RPC methods directly from the SDK playground.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RpcPage,
});

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

const presets = [
  { method: "condenser_api.get_dynamic_global_properties", params: "[]" },
  { method: "condenser_api.get_block", params: "[1]" },
  { method: "condenser_api.get_accounts", params: '[["hiveio"]]' },
  {
    method: "account_history_api.get_transaction",
    params: '{\n  "id": "TRANSACTION_ID",\n  "include_reversible": true\n}',
  },
];

function RpcPage() {
  const { hive, endpoint } = useHive();
  const [method, setMethod] = useState(presets[0]!.method);
  const [params, setParams] = useState("[]");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(undefined);
  const [request, setRequest] = useState<unknown>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);

  const send = async () => {
    setLoading(true);
    setError(null);
    setResult(undefined);
    try {
      const trimmed = params.trim();
      const parsedParams: unknown = trimmed === "" ? [] : JSON.parse(trimmed);
      setRequest({ jsonrpc: "2.0", method, params: parsedParams, id: 1 });
      const response = await hive.rpc.call(method, parsedParams);
      setResult(response);
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.rpc.call()"
        title="Raw RPC"
        description={`Every call is a JSON-RPC 2.0 POST to ${endpoint}. Useful for debugging Hive nodes and Beacon-compatible endpoints.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <label className="block">
            <span className={labelClass}>RPC Method</span>
            <input
              className={inputClass}
              value={method}
              spellCheck={false}
              onChange={(event) => setMethod(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.method}
                onClick={() => {
                  setMethod(preset.method);
                  setParams(preset.params);
                }}
                className="rounded-md border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
              >
                {preset.method.split(".")[1]}
              </button>
            ))}
          </div>

          <label className="block">
            <span className={labelClass}>Params JSON</span>
            <textarea
              className={`${inputClass} min-h-48 resize-y`}
              value={params}
              spellCheck={false}
              onChange={(event) => setParams(event.target.value)}
            />
          </label>

          <button
            onClick={() => void send()}
            disabled={loading || method.trim() === ""}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Terminal className="size-4" />
            {loading ? "Sending RPC request..." : "Send RPC Request"}
          </button>
        </section>

        <section className="space-y-4">
          {request != null && (
            <JsonBlock value={request} label="Request body" collapsible defaultOpen={false} />
          )}
          {error && <ErrorPanel message={error.message} raw={error.raw} />}
          {result !== undefined && <JsonBlock value={result} label="Result" maxHeight="34rem" />}
          {result === undefined && !error && !loading && (
            <div className="panel p-5 text-sm text-muted-foreground">
              The parsed result and the exact request body appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
