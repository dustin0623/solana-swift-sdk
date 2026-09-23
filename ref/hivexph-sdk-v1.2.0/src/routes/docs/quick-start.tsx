import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/quick-start")({
  head: () => ({
    meta: [
      { title: "Quick start — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Three working paths in a few lines each: standardized Custom JSON, Hive Keychain browser signing and backend signing with account aliases.",
      },
      { property: "og:title", content: "Quick start — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Custom JSON, Keychain and backend signing examples you can copy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuickStartPage,
});

const toc = [
  { id: "build", label: "Build a payload" },
  { id: "keychain", label: "Browser: Keychain" },
  { id: "backend", label: "Backend signing" },
  { id: "read", label: "Read it back" },
];

function QuickStartPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Quick start"
      description="Every snippet below runs against the real SDK. Pick the path that matches where your code executes."
      path="/docs/quick-start"
      toc={toc}
      playground={{ to: "/docs/playground/custom-json", label: "Try it in the playground" }}
    >
      <DocSection id="build" title="Build a standardized payload">
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient();

const operation = hive.builder.buildOperation({
  username: "alice",
  id: "my-application",
  action: "claim",
  metadata: { rewardId: "123" },
  authority: "posting",
});`}
        />
      </DocSection>

      <DocSection id="keychain" title="Browser: sign with Hive Keychain">
        <CodeBlock
          language="typescript"
          code={`if (!hive.keychain.isAvailable()) {
  throw new Error("Install the Hive Keychain extension");
}

const signIn = await hive.keychain.requestSignIn({
  username: "alice",
  message: "Sign in to my-application: nonce-123456",
});

const result = await hive.keychain.customJson({
  username: "alice",
  id: "my-application",
  action: "claim",
  metadata: { rewardId: "123" },
  authority: "posting",
  message: "Claim reward",
});

console.log(result.transactionId);`}
        />
        <Callout tone="info">
          A Keychain result means the transaction was submitted, not that it was included in a
          block. Confirm inclusion with the transaction reader or a block stream.
        </Callout>
      </DocSection>

      <DocSection id="backend" title="Backend: sign with an account alias">
        <CodeBlock
          language="typescript"
          filename="server.ts"
          code={`const hive = new HiveClient({
  accounts: {
    treasury: { accountEnv: "HIVE_TREASURY_ACCOUNT", keyEnv: "HIVE_TREASURY_ACTIVE_KEY" },
  },
});

const result = await hive.issuer.token.issue({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "10",
});`}
        />
        <Callout tone="security">
          The alias resolves to a real account and key only at call time, inside the server runtime.
        </Callout>
      </DocSection>

      <DocSection id="read" title="Read the transaction back">
        <CodeBlock
          language="typescript"
          code={`const read = await hive.reader.transaction({ transactionId: result.transactionId! });
console.log(read.customJson);`}
        />
      </DocSection>
    </DocPage>
  );
}
