import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/raw-rpc")({
  head: () => ({
    meta: [
      { title: "Raw RPC — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Call any Hive JSON-RPC method directly through the SDK client, with the official API namespaces, request format and reference repositories.",
      },
      { property: "og:title", content: "Raw RPC — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Escape hatch for any Hive JSON-RPC method not wrapped by the SDK.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RawRpcPage,
});

const toc = [
  { id: "call", label: "Calling a method" },
  { id: "wire", label: "The wire format" },
  { id: "helpers", label: "Built-in helpers" },
  { id: "namespaces", label: "API namespaces" },
  { id: "common", label: "Common methods" },
  { id: "engine", label: "Hive Engine RPC" },
  { id: "reference", label: "Reference repositories" },
];

const link = "text-accent underline decoration-accent/40 hover:decoration-accent";

const namespaces: { name: string; type: string; required?: boolean; description: string }[] = [
  {
    name: "condenser_api",
    type: "hived",
    description:
      "Legacy-compatible catch-all: accounts, blocks, transactions, chain properties, content. Easiest starting point.",
  },
  {
    name: "database_api",
    type: "hived",
    description:
      "Modern typed reads: find_accounts, list_accounts, get_dynamic_global_properties, find_votes, list_witnesses.",
  },
  {
    name: "block_api",
    type: "hived",
    description: "get_block, get_block_header, get_block_range — the fastest way to read blocks.",
  },
  {
    name: "account_history_api",
    type: "hived",
    description:
      "get_transaction, get_account_history, enum_virtual_ops — used by the SDK transaction reader.",
  },
  {
    name: "network_broadcast_api",
    type: "hived",
    description: "broadcast_transaction and broadcast_transaction_synchronous for signed transactions.",
  },
  {
    name: "account_by_key_api",
    type: "hived",
    description: "get_key_references — resolve a public key back to the accounts that use it.",
  },
  {
    name: "rc_api",
    type: "hived",
    description: "find_rc_accounts, get_resource_params — Resource Credit accounting.",
  },
  {
    name: "market_history_api",
    type: "hived",
    description: "Internal HIVE/HBD market: get_ticker, get_trade_history, get_market_history.",
  },
  {
    name: "transaction_status_api",
    type: "hived",
    description: "find_transaction — check whether a broadcast transaction was included.",
  },
  {
    name: "bridge",
    type: "hivemind",
    description:
      "Social layer served by Hivemind (not hived): get_ranked_posts, get_discussion, get_profile, get_follow_list.",
  },
];

function RawRpcPage() {
  return (
    <DocPage
      eyebrow="RPC"
      title="Raw RPC"
      description="Anything the SDK does not wrap is one call away. The raw client shares the same endpoint resolution and failover as every other module, so you can reach every hived and Hivemind API."
      path="/docs/raw-rpc"
      toc={toc}
      playground={{ to: "/docs/playground/rpc", label: "Open the RPC playground" }}
    >
      <DocSection id="call" title="Calling a method">
        <CodeBlock
          language="typescript"
          code={`const props = await hive.rpc.call("condenser_api.get_dynamic_global_properties", []);

// Positional params (array) — legacy condenser_api style.
const accounts = await hive.rpc.call("condenser_api.get_accounts", [["alice"]]);

// Named params (object) — appbase style used by the modern APIs.
const found = await hive.rpc.call("database_api.find_accounts", { accounts: ["alice"] });

// Abortable.
const controller = new AbortController();
const block = await hive.rpc.call("block_api.get_block", { block_num: 90_000_000 }, {
  signal: controller.signal,
});`}
        />
        <ParamTable
          caption="hive.rpc.call(method, params?, options?)"
          rows={[
            {
              name: "method",
              type: "string",
              required: true,
              description: 'Fully qualified "namespace.method", e.g. "block_api.get_block_range".',
            },
            {
              name: "params",
              type: "unknown[] | object",
              description:
                "Array for positional params, object for named params. Defaults to []. Check the method's docs for which it expects.",
            },
            {
              name: "options.signal",
              type: "AbortSignal",
              description: "Cancels the in-flight request; AbortError is rethrown untouched.",
            },
          ]}
        />
        <Callout tone="info">
          Node errors are normalized into SDK errors, so failures look the same whether they come
          from the raw client or a wrapped module: transport problems raise{" "}
          <code>HTTP_ERROR</code> (and trigger failover to the next node), while a JSON-RPC{" "}
          <code>error</code> body raises <code>RPC_ERROR</code>.
        </Callout>
      </DocSection>

      <DocSection id="wire" title="The wire format">
        <Prose>
          <p>
            Hive nodes speak <strong>JSON-RPC 2.0 over HTTP POST</strong> at the root path of the
            node. There is no REST-style GET API on <code>hived</code> — every read and write is the
            same POST with a different <code>method</code>. The SDK sends exactly this body, so
            anything you can curl you can call:
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`curl -s https://api.hive.blog \\
  -H 'Content-Type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "method": "condenser_api.get_dynamic_global_properties",
    "params": [],
    "id": 1
  }'`}
        />
        <Prose>
          <p>
            Older clients also accept the two-argument form{" "}
            <code>{'{"method":"call","params":["condenser_api","get_accounts",[["alice"]]]}'}</code>.
            Prefer the fully qualified <code>namespace.method</code> form shown above — it is what
            current nodes document and what this SDK uses.
          </p>
        </Prose>
        <Callout tone="warning">
          Broadcasting requires a signed transaction. Use <code>hive.issuer</code>, <code>hive.payments</code> or Keychain to produce one — passing
          an unsigned transaction to <code>network_broadcast_api.broadcast_transaction</code> is
          rejected by the node.
        </Callout>
      </DocSection>

      <DocSection id="helpers" title="Built-in helpers">
        <Prose>
          <p>
            The most common reads already have typed wrappers on <code>hive.rpc</code> — use those
            before reaching for <code>call</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.rpc.getDynamicGlobalProperties(); // DynamicGlobalProperties
await hive.rpc.getHeadBlockNumber();        // number
await hive.rpc.getBlock(90_000_000);        // HiveBlock | null

hive.rpc.endpoint;          // currently selected node
hive.rpc.fallbackEndpoint;  // failover target
hive.rpc.resetEndpoint();   // drop failure history, re-run Beacon discovery next call`}
        />
      </DocSection>

      <DocSection id="namespaces" title="API namespaces">
        <Prose>
          <p>
            Every method belongs to a namespace, and each namespace is a plugin the node operator
            must have enabled — a public node may not serve all of them. The full, authoritative
            method list lives in the{" "}
            <a className={link} href="https://developers.hive.io/apidefinitions/" target="_blank" rel="noreferrer">
              Hive API Definitions
            </a>
            ; the namespaces you will actually use are:
          </p>
        </Prose>
        <ParamTable caption="Namespace / served by" rows={namespaces} />
        <Callout tone="info">
          If a call fails with a &ldquo;could not find API&rdquo; style RPC error, the node simply
          does not run that plugin. Pick another node from{" "}
          <a className={link} href="https://beacon.peakd.com/" target="_blank" rel="noreferrer">
            PeakD Beacon
          </a>{" "}
          or the{" "}
          <a className={link} href="/docs/playground/nodes">
            node health playground
          </a>
          , and see the{" "}
          <a
            className={link}
            href="https://developers.hive.io/nodeop/plugin-and-api-list.html"
            target="_blank"
            rel="noreferrer"
          >
            plugin &amp; API list
          </a>{" "}
          for which plugin backs which namespace.
        </Callout>
      </DocSection>

      <DocSection id="common" title="Common methods">
        <Prose>
          <p>
            A practical starter set — the ones most apps built on this SDK end up calling. Full
            parameter documentation for each is on{" "}
            <a className={link} href="https://developers.hive.io/apidefinitions/" target="_blank" rel="noreferrer">
              developers.hive.io
            </a>
            .
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Chain state
await hive.rpc.call("condenser_api.get_dynamic_global_properties", []);
await hive.rpc.call("condenser_api.get_chain_properties", []);
await hive.rpc.call("condenser_api.get_current_median_history_price", []);

// Accounts
await hive.rpc.call("condenser_api.get_accounts", [["alice", "bob"]]);
await hive.rpc.call("database_api.find_accounts", { accounts: ["alice"] });
await hive.rpc.call("account_by_key_api.get_key_references", { keys: ["STM7..."] });
await hive.rpc.call("rc_api.find_rc_accounts", { accounts: ["alice"] });

// Blocks
await hive.rpc.call("block_api.get_block", { block_num: 90000000 });
await hive.rpc.call("block_api.get_block_range", { starting_block_num: 90000000, count: 10 });
await hive.rpc.call("condenser_api.get_block_header", [90000000]);

// Transactions & history
await hive.rpc.call("account_history_api.get_transaction", {
  id: "0000000000000000000000000000000000000000",
  include_reversible: true,
});
await hive.rpc.call("account_history_api.get_account_history", {
  account: "alice",
  start: -1,
  limit: 100,
  include_reversible: true,
});
await hive.rpc.call("transaction_status_api.find_transaction", { transaction_id: "..." });

// Broadcast (transaction must already be signed)
await hive.rpc.call("network_broadcast_api.broadcast_transaction", { trx: signedTransaction });

// Market
await hive.rpc.call("market_history_api.get_ticker", {});

// Social layer (Hivemind)
await hive.rpc.call("bridge.get_ranked_posts", { sort: "trending", tag: "hive", limit: 20 });
await hive.rpc.call("bridge.get_profile", { account: "alice" });`}
        />
      </DocSection>

      <DocSection id="engine" title="Hive Engine RPC">
        <Prose>
          <p>
            Layer 2 (Hive Engine) is a <em>different</em> JSON-RPC service — it is not reachable
            through a <code>hived</code> node. The SDK talks to it internally for token and NFT
            state; if you need a raw Layer 2 contract read, POST to the sidechain node directly:
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`curl -s https://api.hive-engine.com/rpc/contracts \\
  -H 'Content-Type: application/json' \\
  -d '{
    "jsonrpc": "2.0",
    "method": "find",
    "params": { "contract": "tokens", "table": "balances", "query": { "account": "alice" } },
    "id": 1
  }'`}
        />
        <Prose>
          <p>
            Endpoints: <code>/rpc/contracts</code> (contract state via <code>find</code> /{" "}
            <code>findOne</code>) and <code>/rpc/blockchain</code> (sidechain blocks and
            transactions). See the{" "}
            <a
              className={link}
              href="https://github.com/hive-engine/steemsmartcontracts-wiki"
              target="_blank"
              rel="noreferrer"
            >
              Hive Engine contracts wiki
            </a>
            .
          </p>
        </Prose>
      </DocSection>

      <DocSection id="reference" title="Reference repositories">
        <Prose>
          <p>
            There are hundreds of methods across the namespaces and they change with each hardfork,
            so rather than mirroring them here, go to the source:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <a className={link} href="https://developers.hive.io/apidefinitions/" target="_blank" rel="noreferrer">
                Hive Developer Portal — API Definitions
              </a>{" "}
              — every namespace, every method, with request and response JSON.
            </li>
            <li>
              <a
                className={link}
                href="https://developers.hive.io/nodeop/plugin-and-api-list.html"
                target="_blank"
                rel="noreferrer"
              >
                Plugin &amp; API list
              </a>{" "}
              — which plugin a node must enable to serve a namespace.
            </li>
            <li>
              <a className={link} href="https://gitlab.syncad.com/hive/hive" target="_blank" rel="noreferrer">
                hive/hive (hived)
              </a>{" "}
              — the node implementation; the API plugins under{" "}
              <code>libraries/plugins/apis/</code> are the ground truth for method names and
              argument structs.
            </li>
            <li>
              <a className={link} href="https://gitlab.syncad.com/hive/hivemind" target="_blank" rel="noreferrer">
                hive/hivemind
              </a>{" "}
              — the social layer serving <code>bridge.*</code> and the tag/follow APIs.
            </li>
            <li>
              <a className={link} href="https://github.com/openhive-network/hive-js" target="_blank" rel="noreferrer">
                openhive-network/hive-js
              </a>{" "}
              and{" "}
              <a className={link} href="https://gitlab.syncad.com/hive/dhive" target="_blank" rel="noreferrer">
                dhive
              </a>{" "}
              — reference clients; useful for seeing real params for a method.
            </li>
            <li>
              <a className={link} href="https://beacon.peakd.com/" target="_blank" rel="noreferrer">
                PeakD Beacon
              </a>{" "}
              — live node list and health, the same source <code>hive.beacon</code> uses.
            </li>
            <li>
              <a
                className={link}
                href="https://github.com/hive-engine/steemsmartcontracts-wiki"
                target="_blank"
                rel="noreferrer"
              >
                Hive Engine contracts wiki
              </a>{" "}
              — Layer 2 contracts, tables and actions.
            </li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
