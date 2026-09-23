import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/raw-custom-json")({
  head: () => ({
    meta: [
      { title: "Raw Custom JSON — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Broadcast protocol-specific custom_json payloads that must bypass the standardized { action, metadata } envelope, such as Hive Engine contract actions.",
      },
      { property: "og:title", content: "Raw Custom JSON — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Send protocol-specific JSON strings without the standardized envelope.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RawCustomJsonPage,
});

const toc = [
  { id: "when", label: "When to use it" },
  { id: "keychain", label: "customJsonRaw()" },
  { id: "params", label: "Parameters" },
];

function RawCustomJsonPage() {
  return (
    <DocPage
      eyebrow="Core concepts"
      title="Raw Custom JSON"
      description="Some protocols define their own json shape. Raw mode broadcasts your string exactly as written — the SDK adds nothing."
      path="/docs/raw-custom-json"
      toc={toc}
      playground={{ to: "/docs/playground/raw-custom-json", label: "Try raw mode" }}
    >
      <DocSection id="when" title="When to use it">
        <Prose>
          <p>
            Use raw mode when an existing protocol owns the payload shape: Hive Engine{" "}
            <code>ssc-mainnet-hive</code> contract actions, community operations, or any third-party
            standard. For your own application data, prefer the standardized envelope.
          </p>
        </Prose>
        <Callout tone="warning">
          Nothing is validated beyond the JSON being a string. A malformed payload is accepted by
          the chain and silently ignored by the protocol.
        </Callout>
      </DocSection>

      <DocSection id="keychain" title="customJsonRaw()">
        <CodeBlock
          language="typescript"
          code={`await hive.keychain.customJsonRaw({
  username: "alice",
  id: "ssc-mainnet-hive",
  json: JSON.stringify({
    contractName: "tokens",
    contractAction: "transfer",
    contractPayload: { symbol: "MYTOKEN", account: "bob", quantity: "1" },
  }),
  authority: "active",
  message: "tokens: transfer",
});`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          caption="hive.keychain.customJsonRaw(input)"
          rows={[
            { name: "username", type: "string", required: true, description: "Hive account signing in Keychain." },
            { name: "id", type: "string", required: true, description: "custom_json id defined by the target protocol." },
            { name: "json", type: "string", required: true, description: "Already-serialized JSON body, broadcast verbatim." },
            { name: "authority", type: '"posting" | "active"', description: "Authority required by the protocol." },
            { name: "message", type: "string", description: "Display message inside the Keychain popup." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
