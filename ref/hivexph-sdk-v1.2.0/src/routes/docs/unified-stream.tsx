import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/unified-stream")({
  head: () => ({
    meta: [
      { title: "Unified Stream Engine — HiveXPH SDK" },
      {
        name: "description",
        content:
          "One block reader, many filters: watch Custom JSON and HIVE/HBD or Hive Engine payments through a single hive.reader.stream() connection.",
      },
      { property: "og:title", content: "Unified Stream Engine — HiveXPH SDK" },
      {
        property: "og:description",
        content:
          "Register Custom JSON and payment filters on one blockchain connection with hive.reader.stream().",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnifiedStreamPage,
});

const toc = [
  { id: "overview", label: "One connection" },
  { id: "custom-json", label: "Custom JSON filters" },
  { id: "payments", label: "Payment filters" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "events", label: "Event shapes" },
];

function UnifiedStreamPage() {
  return (
    <DocPage
      eyebrow="Reading"
      title="Unified stream engine"
      description="hive.reader.stream() opens a single block reader and dispatches every operation to as many Custom JSON and payment filters as your application registers."
      path="/docs/unified-stream"
      toc={toc}
      playground={{ to: "/docs/playground/unified-stream", label: "Try the unified stream" }}
    >
      <DocSection id="overview" title="One connection, many filters">
        <Prose>
          <p>
            The engine reads blocks once, parses each operation once, detects its type, normalizes
            it, and only then applies your filters. Registering a filter — before or after{" "}
            <code>start()</code> — never opens another connection.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const stream = hive.reader.stream({ fromBlock: 90_000_000 });

stream.customJson({
  id: "my-game",
  actions: ["claim", "gift"],
  handler: (event) => console.log(event.account, event.metadata),
});

stream.payment({
  account: "my-shop",
  actions: ["purchase", "topup"],
  requireTrigger: true,
  handler: (payment) => fulfilOrder(payment.trigger?.metadata),
  onFailed: (payment) => console.warn(payment.error),
});

await stream.start();`}
        />
        <Callout tone="info" title="No network field">
          Payment filters have no <code>network</code> option. The engine detects native HIVE/HBD
          transfers and Layer 2 token transfers itself and reports the origin on the event.
        </Callout>
      </DocSection>

      <DocSection id="custom-json" title="Custom JSON filters">
        <ParamTable
          caption="CustomJsonFilter"
          rows={[
            { name: "id", type: "string", description: 'custom_json id, e.g. "my-game".' },
            {
              name: "actions",
              type: "string[]",
              description:
                "OR-matched standardized actions from the { action, metadata } payload.",
            },
            {
              name: "standardizedOnly",
              type: "boolean",
              description: "Skip raw protocol payloads that do not follow the envelope.",
            },
            {
              name: "handler",
              type: "(event: CustomJsonStreamEvent) => void | Promise<void>",
              description: "Required. Called for every matching operation.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="payments" title="Payment filters">
        <ParamTable
          caption="PaymentFilter"
          rows={[
            { name: "from", type: "string", description: "Sender account." },
            { name: "account", type: "string", description: "Recipient account." },
            { name: "symbol", type: "string", description: "HIVE, HBD or a Layer 2 token." },
            {
              name: "quantity",
              type: "string",
              description: "Exact amount as a precision-safe decimal string — never a number.",
            },
            {
              name: "actions",
              type: "string[]",
              description:
                "OR-matched trigger actions. Implies a valid standardized trigger; omit them to match payments with or without triggers.",
            },
            {
              name: "requireTrigger",
              type: "boolean",
              description: "Only match transfers carrying a valid { action, metadata } trigger.",
            },
            {
              name: "handler",
              type: "(payment: PaymentStreamEvent) => void",
              description: "Verified successful payments only.",
            },
            {
              name: "onFailed",
              type: "(payment: PaymentStreamEvent) => void",
              description: "Matching payments whose Layer 2 execution failed.",
            },
          ]}
        />
        <Prose>
          <p>
            Hive Engine transfers are checked against the sidechain execution logs before{" "}
            <code>handler</code> fires, so a token transfer that was broadcast but reverted reaches{" "}
            <code>onFailed</code> instead.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="lifecycle" title="Lifecycle">
        <CodeBlock
          language="typescript"
          code={`const unsubscribe = stream.customJson({ id: "my-game", handler });
unsubscribe();            // or unsubscribe.unsubscribe()

stream.onEvent((event) => log(event.type, event));

await stream.start();     // starts the single block loop
stream.pause();           // stop dispatching, keep the loop alive
stream.resume();
stream.stop();            // end the loop
stream.clearFilters();`}
        />
        <ParamTable
          caption="UnifiedStreamOptions"
          rows={[
            {
              name: "fromBlock",
              type: "number",
              description:
                "First block to read. Defaults to the head block; history flows into live blocks without a gap.",
            },
            {
              name: "signal",
              type: "AbortSignal",
              description: "Abort the block loop from the outside.",
            },
            {
              name: "onError",
              type: "(error: unknown) => void",
              description: "Non-fatal transport or parse errors.",
            },
            {
              name: "engineConfirmationAttempts",
              type: "number",
              description:
                "How many times a pending Layer 2 execution is re-read before giving up. Default 6 — the sidechain indexes a few seconds after the Hive block.",
            },
            {
              name: "engineConfirmationDelayMs",
              type: "number",
              description: "Delay between Layer 2 execution reads. Default 2000.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="events" title="Event shapes">
        <Prose>
          <p>
            Every event carries its blockchain position — <code>transactionId</code>,{" "}
            <code>blockNumber</code>, <code>blockTimestamp</code>, <code>transactionIndex</code> and{" "}
            <code>operationIndex</code> — which together form a stable idempotency key.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`type StreamEvent =
  | CustomJsonStreamEvent   // type: "custom_json"
  | PaymentStreamEvent;     // type: "payment"

stream.onEvent((event) => {
  if (event.type === "payment") console.log(event.source.type, event.transfer.symbol);
});`}
        />
      </DocSection>
    </DocPage>
  );
}
