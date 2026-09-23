import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/rpc-resolution")({
  head: () => ({
    meta: [
      { title: "RPC resolution — HiveXPH SDK" },
      {
        name: "description",
        content:
          "How the SDK chooses a Hive node: the built-in default endpoint, an explicit custom URL, or live Beacon node discovery.",
      },
      { property: "og:title", content: "RPC resolution — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Default endpoint, custom nodes and Beacon-based node discovery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RpcResolutionPage,
});

const toc = [
  { id: "default", label: "Default endpoint" },
  { id: "custom", label: "Custom endpoint" },
  { id: "beacon", label: "Beacon discovery" },
];

function RpcResolutionPage() {
  return (
    <DocPage
      eyebrow="Configuration"
      title="RPC resolution"
      description="Node selection belongs to the RPC system, not to configurations. That keeps account setup portable across environments and nodes swappable at runtime."
      path="/docs/rpc-resolution"
      toc={toc}
      playground={{ to: "/docs/playground/nodes", label: "Switch nodes live" }}
    >
      <DocSection id="default" title="Default endpoint">
        <CodeBlock
          language="typescript"
          code={`import { DEFAULT_RPC_ENDPOINT } from "hivexph-sdk";

const hive = new HiveClient();
hive.endpoint; // DEFAULT_RPC_ENDPOINT`}
        />
      </DocSection>

      <DocSection id="custom" title="Custom endpoint">
        <CodeBlock
          language="typescript"
          code={`const hive = new HiveClient({ endpoint: "https://api.deathwing.me" });

await hive.rpc.getDynamicGlobalProperties();
await hive.rpc.getHeadBlockNumber();`}
        />
        <Prose>
          <p>
            Every module bound to a configuration — reader, stream, issuer — uses that
            configuration&apos;s RPC client, so a single endpoint change applies everywhere.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="beacon" title="Beacon discovery & failover">
        <Prose>
          <p>
            Without an <code>endpoint</code> override, the RPC client resolves nodes automatically:
            it asks Beacon for the top-ranked healthy node, falls back to{" "}
            <code>DEFAULT_RPC_ENDPOINT</code> when that node fails, and then retries with the next
            best Beacon node that has not been tried yet.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const hive = new HiveClient(); // beacon top node -> default -> next beacon node

await hive.rpc.getHeadBlockNumber();
hive.rpc.endpoint;         // node currently in use
hive.rpc.fallbackEndpoint; // failover endpoint
hive.rpc.resetEndpoint();  // forget failures, re-run discovery

// Explicit override disables discovery and failover entirely:
const pinned = new HiveClient({ endpoint: "https://api.deathwing.me" });`}
        />
        <Callout tone="info">
          Only transport errors (network failures and non-2xx responses) trigger failover. A valid
          JSON-RPC error is returned to the caller as-is.
        </Callout>
      </DocSection>

    </DocPage>
  );
}
