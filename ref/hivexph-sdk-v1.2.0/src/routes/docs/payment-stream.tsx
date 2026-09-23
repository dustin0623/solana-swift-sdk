import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/payment-stream")({
  head: () => ({
    meta: [
      { title: "Payment Stream — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Watch live HIVE, HBD and Hive Engine payments as an async iterator or callback stream, with filters, execution checks and clean cancellation.",
      },
      { property: "og:title", content: "Payment Stream — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Live payment detection with filters and Layer 2 execution verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentStreamPage,
});

const toc = [
  { id: "watch", label: "Async iterator" },
  { id: "stream", label: "One block stream" },
  { id: "filters", label: "Filters" },
  { id: "callbacks", label: "Callbacks" },
  { id: "execution", label: "Execution checks" },
];

function PaymentStreamPage() {
  return (
    <DocPage
      eyebrow="Payments"
      title="Payment stream"
      description="Turn the block stream into a live payment feed. Every transfer is normalized, filtered, and — for Hive Engine — checked against the sidechain execution logs before it is reported as successful."
      path="/docs/payment-stream"
      toc={toc}
      playground={{ to: "/docs/playground/payment-monitor", label: "Monitor payments live" }}
    >
      <DocSection id="watch" title="Async iterator">
        <CodeBlock
          language="typescript"
          code={`const controller = new AbortController();

for await (const payment of hive.payments.watch({
  filters: { actions: ["purchase"] },
  onSuccess: (payment) => console.log("verified", payment.transfer.quantity),
  onFailed: (payment) => console.warn("failed", payment.error),
  signal: controller.signal,
})) {
  console.log(payment.status, payment.transfer, payment.trigger);
}`}
        />
        <Prose>
          <p>
            <code>hive.payments.watch()</code> is an async generator. Break the loop, abort the
            signal, or return from the function and the underlying block stream stops cleanly.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="stream" title="One block stream">
        <Prose>
          <p>
            <code>hive.payments.watch()</code> is a filtered view of the core block stream — the
            same reader behind <code>hive.blocks.watch()</code>, <code>hive.customJson.watch()</code>{" "}
            and <code>hive.reader.stream()</code>. Watching payments never opens a second
            blockchain connection.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`for await (const payment of hive.payments.watch({
  fromBlock: 90_000_000,
  filters: { symbol: "MYTOKEN", actions: ["purchase"], requireTrigger: true },
  onSuccess: (payment) => fulfilOrder(payment.trigger?.metadata),
  onFailed: (payment) => console.warn(payment.error),
})) {
  console.log(payment.blockNumber, payment.status);
}`}
        />
      </DocSection>

      <DocSection id="filters" title="Filters">
        <ParamTable
          caption="PaymentStreamFilters (all optional)"
          rows={[
            { name: "from", type: "string", description: "Sender account." },
            { name: "account", type: "string", description: "Recipient account." },
            { name: "symbol", type: "string", description: "Asset or token symbol." },
            {
              name: "quantity",
              type: "string",
              description: "Exact amount, compared as a precision-safe decimal string.",
            },
            {
              name: "actions",
              type: "string[]",
              description:
                "OR-matched trigger actions. Providing them requires a valid standardized trigger.",
            },
            {
              name: "requireTrigger",
              type: "boolean",
              description: "Only emit transfers that carried a valid { action, metadata } trigger.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="callbacks" title="Callbacks">
        <ParamTable
          caption="PaymentStreamOptions callbacks (all optional)"
          rows={[
            {
              name: "onSuccess",
              type: "(payment) => void | Promise<void>",
              description: "Payments whose success field is true.",
            },
            {
              name: "onFailed",
              type: "(payment) => void | Promise<void>",
              description: "Payments whose success field is false.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="execution" title="Execution checks">
        <Callout tone="warning">
          A Hive Engine payment is only promoted to <code>success: true</code> after the stream
          queries the sidechain RPC and sees a transfer event in the execution logs. A log with an{" "}
          <code>errors</code> array becomes <code>success: false</code>; missing info keeps it{" "}
          <code>pending</code>.
        </Callout>
        <Prose>
          <p>
            Native HIVE / HBD payments are final once included in a block, so they move straight to{" "}
            <code>success: true</code>. Malformed memos never throw: the payment is emitted with{" "}
            <code>trigger: null</code> and filtered out when <code>requireTrigger</code> is enabled.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
