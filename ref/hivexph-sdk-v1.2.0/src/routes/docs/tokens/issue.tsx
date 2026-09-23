import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/tokens/issue")({
  head: () => ({
    meta: [
      { title: "Issue tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint new units of a Hive Engine token you own to any account, from a backend alias or through Hive Keychain.",
      },
      { property: "og:title", content: "Issue tokens — HiveXPH SDK" },
      { property: "og:description", content: "Mint Hive Engine tokens from backend or Keychain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenIssuePage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function TokenIssuePage() {
  return (
    <DocPage
      eyebrow="Tokens"
      title="Issue tokens"
      description="Mint new supply of a token you control into a destination account. Quantities are always decimal strings."
      path="/docs/tokens/issue"
      toc={toc}
      playground={{ to: "/docs/playground/token/issue", label: "Try it: issue tokens" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>
            Backend calls take a configuration alias as <code>from</code>; Keychain calls take a{" "}
            <code>username</code>. Both emit the identical <code>tokens</code> contract action.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.token.issue({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "100.000",
  memo: "welcome bonus", // optional
});

await hive.keychainIssuer.token.issue({
  username: "alice",
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "100.000",
});

// Offline preview of the custom_json operation
hive.keychainIssuer.token.buildIssue({ symbol: "MYTOKEN", account: "bob", quantity: "100.000" });`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "symbol", type: "string", required: true, description: "Token symbol being minted." },
            { name: "account", type: "string", required: true, description: "Destination Hive account." },
            { name: "quantity", type: "string", required: true, description: "Decimal string, never a number." },
            { name: "memo", type: "string", description: "Optional memo attached to the action." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
