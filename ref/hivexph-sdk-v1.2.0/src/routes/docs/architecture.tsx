import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { BackendVsKeychain, Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — HiveXPH SDK" },
      {
        name: "description",
        content:
          "How HiveClient namespaces, configurations, internal signing, shared action builders and the two transaction paths fit together.",
      },
      { property: "og:title", content: "Architecture — HiveXPH SDK" },
      {
        property: "og:description",
        content: "HiveClient namespaces, shared builders and the backend vs Keychain split.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchitecturePage,
});

const toc = [
  { id: "client", label: "HiveClient" },
  { id: "layers", label: "Layers" },
  { id: "paths", label: "Two paths" },
  { id: "builders", label: "Shared builders" },
];

function ArchitecturePage() {
  return (
    <DocPage
      eyebrow="Core concepts"
      title="Architecture"
      description="One client, clearly separated namespaces. Configuration resolves accounts, the SDK signs internally, RPC broadcasts, and the browser path never touches any of it."
      path="/docs/architecture"
      toc={toc}
    >
      <DocSection id="client" title="HiveClient">
        <CodeBlock
          language="text"
          code={`HiveClient
 ├── configs      your configuration object, stored verbatim and frozen
 ├── accounts     key-free account references from configs.accounts
 ├── rpc          JSON-RPC communication + node selection
 ├── keychain     browser signing (isolated API)
 ├── issuer       backend Hive Engine token + NFT issuance
 ├── reader       read + normalize a transaction
 ├── stream       block and Custom JSON async iterators
 ├── builder      standardized Custom JSON builder
 └── parser       Custom JSON detection + normalization`}
        />
        <Prose>
          <p>
            One client owns one configuration. <code>hive.configs</code> stores it as-is; the SDK
            never switches environments at runtime. Need another configuration? Create another
            client.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="layers" title="Layers">
        <CodeBlock
          language="text"
          code={`alias  ->  account/key env vars  ->  environment resolver  ->  internal signing  ->  rpc`}
        />
        <Callout tone="security">
          Nothing in the SDK stores a private key. Values are read from the environment at
          call time and discarded after the transaction is signed.
        </Callout>
      </DocSection>

      <DocSection id="paths" title="Two transaction paths">
        <BackendVsKeychain />
      </DocSection>

      <DocSection id="builders" title="Shared action builders">
        <Prose>
          <p>
            Both paths reuse the same pure builders (<code>TokenActionBuilder</code>,{" "}
            <code>NftActionBuilder</code>), so a payload created in the browser is byte-identical to
            the one a backend signs.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Backend preview — offline, no keys, no network
const preview = hive.issuer.token.buildIssue({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "10" });

// Keychain preview — same contract action shape
const action = hive.keychainIssuer.token.buildIssue({ symbol: "MYTOKEN", account: "bob", quantity: "10" });`}
        />
      </DocSection>
    </DocPage>
  );
}
