import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/tokens/burn")({
  head: () => ({
    meta: [
      { title: "Burn tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Burn Hive Engine tokens by sending them to the null account, or to a custom burn destination, from a backend or Hive Keychain.",
      },
      { property: "og:title", content: "Burn tokens — HiveXPH SDK" },
      { property: "og:description", content: "Burn Hive Engine tokens to null or a custom account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenBurnPage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function TokenBurnPage() {
  return (
    <DocPage
      eyebrow="Tokens"
      title="Burn tokens"
      description="Burning is a transfer to a destination nobody controls. The SDK defaults that destination to the Hive account null."
      path="/docs/tokens/burn"
      toc={toc}
      playground={{ to: "/docs/playground/token/burn", label: "Try it: burn tokens" }}
    >
      <DocSection id="usage" title="Usage">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.token.burn({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  quantity: "10.000",
  // account: "null" by default
});

await hive.keychainIssuer.token.burn({
  username: "alice",
  symbol: "MYTOKEN",
  quantity: "10.000",
});`}
        />
        <Callout tone="warning">Burned supply cannot be recovered.</Callout>
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "symbol", type: "string", required: true, description: "Token symbol being burned." },
            { name: "quantity", type: "string", required: true, description: "Decimal string amount." },
            { name: "account", type: "string", description: 'Optional burn destination, default "null".' },
            { name: "memo", type: "string", description: "Optional memo." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
