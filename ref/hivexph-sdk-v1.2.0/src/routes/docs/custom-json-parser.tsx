import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/custom-json-parser")({
  head: () => ({
    meta: [
      { title: "Custom JSON parser — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Validate and decode raw custom_json operations into typed events without touching the network — the same parser used by the reader and the block stream.",
      },
      { property: "og:title", content: "Custom JSON parser — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Pure, offline validation and decoding of custom_json payloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomJsonParserPage,
});

const toc = [
  { id: "parse", label: "Parsing" },
  { id: "errors", label: "Failure handling" },
];

function CustomJsonParserPage() {
  return (
    <DocPage
      eyebrow="Reading"
      title="Custom JSON parser"
      description="The parser is pure and dependency-free. It turns an operation's json string into a validated event, or reports precisely why it is not protocol-compliant."
      path="/docs/custom-json-parser"
      toc={toc}
    >
      <DocSection id="parse" title="Parsing">
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient();

// Parse + validate a custom_json operation into a normalized event.
const result = hive.customJson.parse(operation, {
  blockNumber: 109_542_165,
  blockTimestamp: "2024-05-01T12:00:00",
  transactionId: "<trx-id>",
  transactionIndex: 0,
  operationIndex: 0,
}, { id: "my-application" });   // optional filter: { id, actions }

if (result.status === "ok") {
  result.event.action;   // "claim"
  result.event.metadata; // { rewardId: "123" }
} else if (result.status === "invalid") {
  result.reason;         // human-readable failure reason
} else {
  // "not_custom_json" — different id, filtered action, or not a custom_json op
}`}
        />
      </DocSection>


      <DocSection id="errors" title="Failure handling">
        <Prose>
          <p>
            The parser never throws on bad input. Malformed JSON, a missing <code>action</code>, or
            metadata that is not an object all resolve to an invalid result with a reason string.
          </p>
        </Prose>
        <Callout tone="info">
          The reader collects these into <code>invalid</code>, and the block stream forwards them to{" "}
          <code>onInvalidPayload</code>, so a single bad operation never stops a run.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
