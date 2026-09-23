import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/block-stream")({
  head: () => ({
    meta: [
      { title: "Block stream — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Stream Hive blocks as an async iterator and filter live Custom JSON events by application id and action, with retries and clean cancellation.",
      },
      { property: "og:title", content: "Block stream — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Async iterators for live blocks and filtered Custom JSON events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlockStreamPage,
});

const toc = [
  { id: "engine", label: "One canonical engine" },
  { id: "events", label: "Streaming events" },
  { id: "blocks", label: "Blocks" },
  { id: "normalized", label: "Normalized block" },
  { id: "options", label: "Options" },
];

function BlockStreamPage() {
  return (
    <DocPage
      eyebrow="Reading"
      title="Block stream"
      description="Streaming is an async iterator, not a callback soup. Break out of the loop or abort a signal and the stream stops immediately."
      path="/docs/block-stream"
      toc={toc}
      playground={{ to: "/docs/playground/unified-stream", label: "Open the unified stream" }}
    >
      <DocSection id="engine" title="One canonical engine">
        <Prose>
          <p>
            There is exactly one block-reading implementation in the SDK. It owns RPC
            communication, head block tracking, block fetching, sequential ordering, historical
            backfill, the historical &#8594; live transition, poll intervals, retries,{" "}
            <code>AbortSignal</code> handling and normalization. Every watching API is a filtered
            view of it — none of them polls the chain itself.
          </p>
        </Prose>
        <CodeBlock
          language="text"
          code={`Hive RPC
  |
  v
Canonical block engine  (fetch, head tracking, retries, normalization, abort)
  |
  +-- hive.blocks.watch()        raw normalized blocks
  +-- hive.customJson.watch()    id + actions filter
  +-- hive.payments.watch()      transfer + trigger detection
  +-- hive.reader.stream()       one loop, many registered filters`}
        />
        <Prose>
          <p>
            A single <code>nextBlock</code> cursor drives history and live blocks, so there is no
            hand-off between backfill and polling: blocks are never skipped, duplicated or read out
            of order. A failed read retries the same height — the cursor only advances after a
            block has been yielded.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="events" title="Streaming events">
        <CodeBlock
          language="typescript"
          code={`const controller = new AbortController();

for await (const event of hive.customJson.watch({
  id: "my-application",
  actions: ["claim"],
  signal: controller.signal,
  onInvalidPayload: ({ reason, blockNumber }) => console.warn(blockNumber, reason),
})) {
  console.log(event.blockNumber, event.action, event.metadata);
}`}
        />
        <Prose>
          <p>
            Without <code>fromBlock</code> the stream starts at the current head block. Pass a block
            number to backfill history and then continue live.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="blocks" title="Blocks">
        <CodeBlock
          language="typescript"
          code={`for await (const block of hive.blocks.watch({ fromBlock: 90000000 })) {
  console.log(block.blockNumber, block.transactions.length);
}`}
        />
      </DocSection>

      <DocSection id="normalized" title="Normalized block">
        <Prose>
          <p>
            RPC nodes expose blocks inconsistently (operation tuples versus typed objects, missing{" "}
            <code>transaction_ids</code>). The engine normalizes once, so parsers and filters never
            deal with that. Every event keeps its chain position for deduplication:{" "}
            <code>transactionId</code>, <code>blockNumber</code>, <code>blockTimestamp</code>,{" "}
            <code>transactionIndex</code> and <code>operationIndex</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`interface NormalizedBlock {
  blockNumber: number;
  blockId: string | null;
  timestamp: string;
  transactions: NormalizedTransaction[];
  raw: HiveBlock;              // exactly what the node returned
}

interface NormalizedTransaction {
  transactionId: string | null;
  transactionIndex: number;
  operations: NormalizedOperation[];
}

interface NormalizedOperation {
  operationIndex: number;
  operationType: string;       // "custom_json", "transfer", ...
  operation: HiveOperation;
}`}
        />
      </DocSection>

      <DocSection id="options" title="Options">
        <ParamTable
          caption="BlockStreamOptions / CustomJsonStreamOptions"
          rows={[
            { name: "id", type: "string", required: true, description: "Custom JSON stream only: application id to filter on." },
            { name: "actions", type: "string[]", description: "Optional action allow-list." },
            { name: "fromBlock", type: "number", description: "First block to read. Defaults to the head block." },
            { name: "signal", type: "AbortSignal", description: "Stops the iterator cleanly." },
            { name: "pollIntervalMs", type: "number", description: "Poll interval while waiting for new blocks. Default 3000." },
            { name: "maxRetriesPerBlock", type: "number", description: "Consecutive failures before throwing. Default 5." },
            { name: "onError", type: "(error, blockNumber) => void", description: "Called on recoverable RPC errors instead of throwing." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
