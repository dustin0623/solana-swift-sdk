import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Blocks, KeyRound, Server } from "lucide-react";
import { useHive } from "@/lib/hive-client";
import { errorMessage } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { StatusCard } from "@/components/playground/StatusCard";
import { ErrorPanel } from "@/components/playground/ResultPanel";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { NodePicker } from "@/components/playground/NodePicker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HiveXPH SDK Playground" },
      {
        name: "description",
        content:
          "Live status of the RPC endpoint, Hive Keychain availability and the current head block for the HiveXPH SDK.",
      },
      { property: "og:title", content: "Dashboard — HiveXPH SDK Playground" },
      {
        property: "og:description",
        content: "RPC connectivity, Keychain detection and head block status for the SDK.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type ConnectionState = "idle" | "connecting" | "connected" | "error";

function Dashboard() {
  const { hive, endpoint, setEndpoint, resetEndpoint } = useHive();
  const [endpointDraft, setEndpointDraft] = useState(endpoint);
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [props, setProps] = useState<unknown>(null);
  const [headBlock, setHeadBlock] = useState<number | null>(null);
  const [keychain, setKeychain] = useState<boolean | null>(null);

  useEffect(() => setEndpointDraft(endpoint), [endpoint]);

  useEffect(() => {
    const check = () => setKeychain(hive.keychain.isAvailable());
    check();
    const timer = setTimeout(check, 1200);
    return () => clearTimeout(timer);
  }, [hive]);

  const testConnection = useCallback(async () => {
    setState("connecting");
    setError(null);
    try {
      const result = await hive.rpc.getDynamicGlobalProperties();
      setProps(result);
      setHeadBlock(result.head_block_number);
      setState("connected");
    } catch (caught) {
      setError(errorMessage(caught));
      setState("error");
    }
  }, [hive]);

  useEffect(() => {
    void testConnection();
  }, [testConnection]);

  return (
    <div className="mx-auto max-w-[92rem] space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="HiveXPH SDK"
        title="Development Playground"
        description="Testing environment for the local SDK source in /package-manager. Write Custom JSON with Hive Keychain, stream blocks, and read transactions — all against the configured RPC endpoint."
      >
        <button
          onClick={() => void testConnection()}
          disabled={state === "connecting"}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Activity className="size-4" />
          {state === "connecting" ? "Connecting..." : "Test connection"}
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          label="RPC Endpoint"
          value={endpoint.replace(/^https?:\/\//, "")}
          icon={<Server className="size-4 text-muted-foreground" />}
          hint="configurable"
        />
        <StatusCard
          label="RPC Connection"
          value={
            state === "connected"
              ? "Connected"
              : state === "connecting"
                ? "Connecting..."
                : state === "error"
                  ? "Failed"
                  : "Idle"
          }
          tone={state === "connected" ? "success" : state === "error" ? "error" : "pending"}
          hint={state === "connected" ? "jsonrpc 2.0" : state === "error" ? "check endpoint" : "…"}
          icon={<Activity className="size-4 text-muted-foreground" />}
        />
        <StatusCard
          label="Hive Keychain"
          value={keychain === null ? "Checking..." : keychain ? "Available" : "Not installed"}
          tone={keychain ? "success" : "error"}
          hint={keychain ? "window.hive_keychain" : "extension required"}
          icon={<KeyRound className="size-4 text-muted-foreground" />}
        />
        <StatusCard
          label="Latest Block"
          value={headBlock ? headBlock.toLocaleString("en-US") : "—"}
          tone="neutral"
          hint="head_block_number"
          icon={<Blocks className="size-4 text-muted-foreground" />}
        />
      </div>

      {error && <ErrorPanel message={error} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">RPC endpoint</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every SDK module shares this endpoint through <code>new HiveClient(&#123;
            endpoint &#125;)</code>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={endpointDraft}
              onChange={(event) => setEndpointDraft(event.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-ring"
            />
            <button
              onClick={() => setEndpoint(endpointDraft)}
              className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Apply
            </button>
            <button
              onClick={resetEndpoint}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick links
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { to: "/keychain", label: "Send Custom JSON" },
                { to: "/reader", label: "Read a transaction" },
                { to: "/stream", label: "Stream blocks" },
                { to: "/rpc", label: "Raw RPC" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <NodePicker />

        <section className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">Standard payload protocol</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every payload the SDK broadcasts contains exactly two fields. Blockchain timestamps are
            authoritative, so no timestamp is embedded.
          </p>
          <div className="mt-4">
            <JsonBlock
              value={{ action: "claim", metadata: { rewardId: "123" } }}
              label="payload"
              maxHeight="10rem"
            />
          </div>
          <div className="mt-4">
            <JsonBlock
              value={props ?? { info: "Run a connection test to load chain properties" }}
              label="get_dynamic_global_properties"
              collapsible
              defaultOpen={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
