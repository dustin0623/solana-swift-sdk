import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/tokens/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Move existing Hive Engine token balance from the signing account to another account, from a backend alias or Hive Keychain.",
      },
      { property: "og:title", content: "Transfer tokens — HiveXPH SDK" },
      { property: "og:description", content: "Move Hive Engine token balance between accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenTransferPage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function TokenTransferPage() {
  return (
    <DocPage
      eyebrow="Tokens"
      title="Transfer tokens"
      description="Transfer moves balance the signing account already holds. Use issue when you want to mint new supply instead."
      path="/docs/tokens/transfer"
      toc={toc}
      playground={{ to: "/docs/playground/token/transfer", label: "Try it: transfer tokens" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>
            A transfer fails on the sidechain when the balance is short — the SDK builds and
            broadcasts the action, Hive Engine settles it.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.token.transfer({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "25.000",
  memo: "payout", // optional
});

await hive.keychainIssuer.token.transfer({
  username: "alice",
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "25.000",
});`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "symbol", type: "string", required: true, description: "Token symbol being moved." },
            { name: "account", type: "string", required: true, description: "Recipient Hive account." },
            { name: "quantity", type: "string", required: true, description: "Decimal string amount." },
            { name: "memo", type: "string", description: "Optional memo." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
