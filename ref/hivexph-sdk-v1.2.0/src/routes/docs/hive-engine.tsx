import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/hive-engine")({
  head: () => ({
    meta: [
      { title: "Hive Engine — HiveXPH SDK" },
      {
        name: "description",
        content:
          "How Hive Engine contract actions are shaped: contractName, contractAction and contractPayload broadcast under the ssc-mainnet-hive custom_json id.",
      },
      { property: "og:title", content: "Hive Engine — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Contract action structure and the shared builders used by both signing paths.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HiveEnginePage,
});

const toc = [
  { id: "shape", label: "Action shape" },
  { id: "constants", label: "Constants" },
  { id: "builders", label: "Pure builders" },
];

function HiveEnginePage() {
  return (
    <DocPage
      eyebrow="Hive Engine"
      title="Hive Engine overview"
      description="Hive Engine is a sidechain that reads custom_json operations under a single id. Every operation is a contract action object serialized into the json field."
      path="/docs/hive-engine"
      toc={toc}
    >
      <DocSection id="shape" title="Action shape">
        <CodeBlock
          language="json"
          code={`{
  "contractName": "tokens",
  "contractAction": "transfer",
  "contractPayload": {
    "symbol": "MYTOKEN",
    "to": "bob",
    "quantity": "1",
    "memo": "payout"
  }
}`}
        />
        <Callout tone="warning">
          Quantities are always strings. Floating-point numbers lose precision and are rejected by
          the sidechain.
        </Callout>
      </DocSection>

      <DocSection id="constants" title="Constants">
        <ParamTable
          caption="Exported from the SDK"
          rows={[
            { name: "HIVE_ENGINE_CUSTOM_JSON_ID", type: "string", description: 'The sidechain id, "ssc-mainnet-hive".' },
            { name: "HIVE_ENGINE_AUTHORITY", type: '"active"', description: "Authority required by contract actions." },
            { name: "TOKEN_CONTRACT / TOKEN_ACTIONS", type: "string / object", description: "tokens contract name and its action names." },
            { name: "NFT_CONTRACT / NFT_ACTIONS", type: "string / object", description: "nft contract name and its action names." },
            { name: "NFT_MAX_ISSUE_MULTIPLE_INSTANCES", type: "number", description: "Instance limit for a single issueMultiple action." },
          ]}
        />
      </DocSection>

      <DocSection id="builders" title="Pure builders">
        <Prose>
          <p>
            <code>hive.issuer.token.actions</code> and <code>hive.issuer.nft.actions</code> are the
            dependency-free protocol builders shared by the backend issuer and the Keychain issuer,
            so both paths produce identical payloads.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient();
const action = hive.issuer.token.actions.buildTransfer({ symbol: "MYTOKEN", account: "bob", quantity: "1" });`}
        />
      </DocSection>
    </DocPage>
  );
}
