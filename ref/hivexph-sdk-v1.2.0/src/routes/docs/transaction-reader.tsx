import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/transaction-reader")({
  head: () => ({
    meta: [
      { title: "Transaction reader — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Read a broadcast transaction by id and decode every Custom JSON operation it contains, with invalid payloads reported separately.",
      },
      { property: "og:title", content: "Transaction reader — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Fetch and decode Custom JSON operations from a transaction id.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionReaderPage,
});

const toc = [
  { id: "read", label: "Read by id" },
  { id: "result", label: "Result shape" },
  { id: "stream", label: "Run a live stream" },
];

function TransactionReaderPage() {
  return (
    <DocPage
      eyebrow="Reading"
      title="Transaction reader"
      description="After broadcasting, confirm what actually landed on chain. The reader fetches a transaction, locates its custom_json operations and decodes them into typed events."
      path="/docs/transaction-reader"
      toc={toc}
      playground={{ to: "/docs/playground/reader", label: "Read a transaction" }}
    >
      <DocSection id="read" title="Read by id">
        <CodeBlock
          language="typescript"
          code={`const read = await hive.reader.transaction({
  transactionId: "b1e2...",
  id: "my-application",     // optional custom_json id filter
  actions: ["claim"],       // optional standardized action filter
});

// every operation, in blockchain order
for (const operation of read.operations) {
  console.log(operation.operationIndex, operation.kind, operation.operationType);
}

// derived views
read.customJson;  // standardized Custom JSON events
read.payments;    // native + Layer 2 payments, triggers already associated
read.nfts;        // Hive Engine NFT actions`}
        />
        <Prose>
          <p>
            Operations that match the id filter but break the payload protocol are never thrown —
            they land in <code>invalid</code> with a reason, so one malformed transaction cannot
            break a batch. Operations the SDK does not interpret are reported as{" "}
            <code>kind: "unknown"</code> instead of being dropped.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="result" title="Result shape">
        <ParamTable
          caption="TransactionResult"
          rows={[
            { name: "transactionId", type: "string", description: "The transaction that was read." },
            { name: "blockNumber", type: "number", description: "Block containing the transaction." },
            { name: "blockTimestamp", type: "string", description: "Block timestamp in ISO form." },
            { name: "transactionIndex", type: "number | null", description: "Position of the transaction inside its block." },
            { name: "operations", type: "TransactionOperationResult<T>[]", description: "Every operation in blockchain order, tagged custom_json / payment / nft / unknown." },
            { name: "customJson", type: "CustomJsonEvent<T>[]", description: "Decoded, protocol-valid Custom JSON events." },
            { name: "payments", type: "ParsedPayment<T>[]", description: "Payments with triggers associated. Layer 2 stays pending until verified." },
            { name: "nfts", type: "NormalizedNftOperation[]", description: "Hive Engine NFT issue / transfer / burn actions." },
            { name: "invalid", type: "{ reason, raw }[]", description: "Matching operations that failed validation." },
            { name: "raw", type: "unknown", description: "Untouched RPC response." },
          ]}
        />
      </DocSection>

      <DocSection id="stream" title="Run a live stream">
        <Prose>
          <p>
            Reading by id is a one-shot lookup. To keep watching the chain, use the same reader in
            streaming mode — one block loop shared by every filter you register.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// multi-filter dispatcher over the single block stream
const stream = hive.reader.stream({ fromBlock: 90_000_000 });

stream.customJson({
  id: "my-application",
  actions: ["claim"],
  handler: (event) => console.log(event.blockNumber, event.action, event.metadata),
});

stream.payment({
  account: "my-shop",
  handler: (payment) => fulfilOrder(payment.trigger?.metadata),
  onFailed: (payment) => console.warn(payment.error),
});

await stream.start();   // starts reading blocks
stream.stop();          // ends the loop`}
        />
        <Prose>
          <p>
            Prefer async iteration? The same engine is exposed as iterators:{" "}
            <code>hive.blocks.watch()</code>, <code>hive.customJson.watch()</code> and{" "}
            <code>hive.payments.watch()</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const controller = new AbortController();

for await (const event of hive.customJson.watch({
  id: "my-application",
  actions: ["claim"],
  signal: controller.signal,
})) {
  console.log(event.blockNumber, event.action, event.metadata);
}`}
        />
      </DocSection>
    </DocPage>
  );
}
