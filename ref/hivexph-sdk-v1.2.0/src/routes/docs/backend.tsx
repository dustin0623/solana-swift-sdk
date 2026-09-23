import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/backend")({
  head: () => ({
    meta: [
      { title: "Backend transactions — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Server-side signing: account aliases, lazy key resolution, internal transaction signing and RPC broadcasting, with offline previews before you send.",
      },
      { property: "og:title", content: "Backend transactions — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Automated server signing with aliases, internal signing and RPC broadcast.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackendPage,
});

const toc = [
  { id: "flow", label: "The flow" },
  { id: "preview", label: "Offline previews" },
  { id: "signing", label: "How signing works" },
];

function BackendPage() {
  return (
    <DocPage
      eyebrow="Transactions"
      title="Backend transactions"
      description="Backend operations are unattended: no popup, no user approval. An alias resolves to an account and key at call time, the SDK signs the transaction internally, and the RPC client broadcasts."
      path="/docs/backend"
      toc={toc}
    >
      <DocSection id="flow" title="The flow">
        <CodeBlock
          language="typescript"
          filename="server.ts"
          code={`const result = await hive.issuer.token.transfer({
  from: hive.accounts.treasury,   // account reference, not a string
  symbol: "MYTOKEN",
  account: "bob",         // destination
  quantity: "5",
  memo: "payout",
});

result.success;        // boolean
result.transactionId;  // broadcast transaction id`}
        />
        <Callout tone="security">
          Never expose this path to the browser. The module that constructs a configuration with{" "}
          <code>keyEnv</code> must stay in server-only code.
        </Callout>
      </DocSection>

      <DocSection id="preview" title="Offline previews">
        <Prose>
          <p>
            Every issuer operation has a <code>build*</code> counterpart that returns the exact
            payload without resolving keys or touching the network — ideal for tests, audit logs and
            confirmation screens.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const preview = hive.issuer.token.buildTransfer({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "5",
});

preview.alias;      // "treasury"
preview.account;    // resolved Hive account
preview.id;         // resolved application id (custom_json id)
preview.json;       // serialized contract action
preview.operation;  // ["custom_json", { ... }]`}
        />
      </DocSection>

      <DocSection id="signing" title="How signing works">
        <Prose>
          <p>
            Signing is internal and not configurable. The SDK resolves the alias key from the
            environment, serializes the transaction, hashes it with the Hive chain id and produces
            a canonical ECDSA signature in pure JavaScript — no native modules, no key storage.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const hive = new HiveClient({
  accounts: { treasury: { account: "my-app", keyEnv: "TREASURY_ACTIVE_KEY" } },
});

// keyEnv is read only at this moment, then discarded
await hive.issuer.token.transfer({ from: hive.accounts.treasury, /* ... */ });`}
        />
      </DocSection>
    </DocPage>
  );
}
