import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { BackendVsKeychain, Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/keychain")({
  head: () => ({
    meta: [
      { title: "Hive Keychain — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Browser signing through the Hive Keychain extension: availability detection, standardized and raw Custom JSON, and Hive Engine issuance.",
      },
      { property: "og:title", content: "Hive Keychain — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Sign in, sign Custom JSON and send Hive Engine actions in the browser with Hive Keychain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KeychainDocsPage,
});

const toc = [
  { id: "detect", label: "Detect the extension" },
  { id: "signin", label: "Sign in" },
  { id: "send", label: "Send a transaction" },
  { id: "transfer", label: "Transfers: native and Layer 2" },
  { id: "engine", label: "Hive Engine contract actions" },
  { id: "compare", label: "Compared to backend" },
];

function KeychainDocsPage() {
  return (
    <DocPage
      eyebrow="Transactions"
      title="Hive Keychain"
      description="The Keychain API is completely separate from configurations, aliases and environment variables. It takes a raw username and the extension signs with the user's own key."
      path="/docs/keychain"
      toc={toc}
      playground={{ to: "/docs/playground/keychain", label: "Open the Keychain playground" }}
    >
      <DocSection id="detect" title="Detect the extension">
        <CodeBlock
          language="typescript"
          code={`if (!hive.keychain.isAvailable()) {
  // The extension injects asynchronously — re-check shortly after mount.
}`}
        />
        <Callout tone="info">
          Keychain injects <code>window.hive_keychain</code> after page load. Check once on mount
          and once again after a short delay.
        </Callout>
      </DocSection>

      <DocSection id="signin" title="Sign in">
        <CodeBlock
          language="typescript"
          code={`const result = await hive.keychain.requestSignIn({
  username: "alice",
  message: "Sign in to my-application: nonce-123456",
  authority: "posting",
});

console.log(result.signature);`}
        />
        <Prose>
          <p>
            Use an app-generated challenge message, store or verify the returned signature in your
            own app, and generate a new challenge for each sign-in attempt.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="send" title="Send a transaction">
        <CodeBlock
          language="typescript"
          code={`const result = await hive.keychain.customJson({
  username: "alice",
  id: "my-application",
  action: "claim",
  metadata: { rewardId: "123" },
  authority: "posting",
  message: "Claim reward",
});`}
        />
        <Prose>
          <p>
            A rejected popup throws with code <code>KEYCHAIN_REJECTED</code>; a missing extension
            throws <code>KEYCHAIN_UNAVAILABLE</code>.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="transfer" title="Transfers: native and Layer 2">
        <Prose>
          <p>
            One call covers both layers. <code>"HIVE"</code> / <code>"HBD"</code> is a native
            Layer 1 transfer; any other symbol is a Hive Engine token and the SDK routes it to
            Keychain's token transfer request. The memo is carried verbatim in both cases.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Layer 1
await hive.keychain.requestTransfer({
  username: "alice",
  to: "treasury",
  amount: "1.000",
  currency: "HIVE",
  memo: JSON.stringify({ action: "buy_pack", metadata: { packs: 1 } }),
});

// Layer 2 — same call, token symbol as currency
await hive.keychain.requestTransfer({
  username: "alice",
  to: "treasury",
  amount: "5",
  currency: "SCRAP",
  memo: JSON.stringify({ action: "buy_pack", metadata: { packs: 1 } }),
});`}
        />
      </DocSection>

      <DocSection id="engine" title="Hive Engine contract actions via Keychain">
        <CodeBlock
          language="typescript"
          code={`await hive.keychainIssuer.token.transfer({
  username: "alice",
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "1",
});

await hive.keychainIssuer.nft.transfer({
  username: "alice",
  account: "bob",
  nfts: [{ symbol: "HERO", ids: ["1", "2"] }],
});`}
        />
      </DocSection>

      <DocSection id="compare" title="Compared to backend">
        <BackendVsKeychain />
      </DocSection>
    </DocPage>
  );
}
