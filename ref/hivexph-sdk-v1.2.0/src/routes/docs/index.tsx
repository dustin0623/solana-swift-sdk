import { createFileRoute, Link } from "@tanstack/react-router";

import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Introduction — HiveXPH SDK" },
      {
        name: "description",
        content:
          "A TypeScript SDK for Hive Custom JSON: standardized payloads, Keychain signing, backend signing, Hive Engine token and NFT issuance, reading and streaming.",
      },
      { property: "og:title", content: "Introduction — HiveXPH SDK" },
      {
        property: "og:description",
        content:
          "Build, sign, broadcast and read Hive Custom JSON transactions from the browser or a server runtime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntroductionPage,
});

const toc = [
  { id: "what", label: "What it does" },
  { id: "install", label: "Install" },
  { id: "paths", label: "Two signing paths" },
  { id: "next", label: "Where to go next" },
];

function IntroductionPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Introduction"
      description="hivexph-sdk builds, signs, broadcasts and reads Hive Custom JSON transactions. One namespaced client covers configurations, signing, RPC, Keychain, Hive Engine issuance, transaction reading and block streaming."
      path="/docs"
      toc={toc}
      playground={{ to: "/docs/playground", label: "Open the playground" }}
    >
      <DocSection id="what" title="What it does">
        <Prose>
          <p>
            Custom JSON is Hive&apos;s general-purpose operation for application data. This SDK
            standardizes it into a predictable <code>{"{ action, metadata }"}</code> envelope, keeps
            protocol-specific payloads (like Hive Engine) untouched when they need to be raw, and
            gives you a single client object for every runtime.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient();

hive.configs   // named configurations + account aliases
hive.rpc       // JSON-RPC communication
hive.keychain  // browser signing through Hive Keychain
hive.issuer    // backend Hive Engine token + NFT issuance
hive.reader    // read a transaction + multi-filter stream dispatcher
hive.blocks    // the one core block stream
hive.customJson// parse + watch standardized custom_json
hive.payments  // native HIVE/HBD + Layer 2 payments and watch()`}
        />
      </DocSection>

      <DocSection id="install" title="Install">
        <CodeBlock language="bash" code={`npm install hivexph-sdk`} />
      </DocSection>

      <DocSection id="paths" title="Two signing paths">
        <Prose>
          <p>
            Browser signing and backend signing are deliberately separate APIs. They share pure
            action builders, so both emit byte-identical payloads, but they never share keys,
            aliases or configuration.
          </p>
        </Prose>
        <Callout tone="security" title="Keys">
          The SDK never stores a private key. Backend keys are resolved from environment variables
          at call time; browser transactions are signed by the Hive Keychain extension.
        </Callout>
      </DocSection>

      <DocSection id="next" title="Where to go next">
        <Prose>
          <p>
            Start with the <Link to="/docs/quick-start" className="text-accent">quick start</Link>,
            then read{" "}
            <Link to="/docs/architecture" className="text-accent">
              architecture
            </Link>{" "}
            for how the namespaces fit together.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
