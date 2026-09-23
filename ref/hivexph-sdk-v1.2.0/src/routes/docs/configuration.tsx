import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — HiveXPH SDK" },
      {
        name: "description",
        content:
          "hive.configs stores the configuration object you pass to the client, fully typed and frozen. The SDK never manages environments or runtime context switching.",
      },
      { property: "og:title", content: "Configuration — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Developer-defined configuration, account aliases and environment references.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfigurationPage,
});

const toc = [
  { id: "shape", label: "One client, one config" },
  { id: "structure", label: "Your own structure" },
  { id: "accounts", label: "The accounts key" },
  { id: "instances", label: "Multiple instances" },
];

function ConfigurationPage() {
  return (
    <DocPage
      eyebrow="Configuration"
      title="Configuration"
      description="hive.configs is the configuration object you passed to the client — stored, frozen and fully typed. The SDK does not manage staging, production or testing."
      path="/docs/configuration"
      toc={toc}
      playground={{ to: "/docs/playground/configurations", label: "Inspect configuration live" }}
    >
      <DocSection id="shape" title="One client, one config">
        <CodeBlock
          language="typescript"
          code={`const hive = new HiveClient(config);

hive.configs; // exactly \`config\`, frozen`}
        />
        <Prose>
          <p>
            Everything you pass, except the SDK runtime options <code>endpoint</code>,{" "}
            <code>beaconUrl</code> and <code>environment</code>, is stored verbatim under{" "}
            <code>hive.configs</code>. There is no active configuration, no environment switching
            and no mutation API.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="structure" title="Your own structure">
        <CodeBlock
          language="typescript"
          code={`const hive = new HiveClient({
  accounts: {
    treasury: { accountEnv: "HIVE_TREASURY_ACCOUNT", keyEnv: "HIVE_TREASURY_ACTIVE_KEY" },
  },

  tests: {
    accounts: { minter: "test-minter" },
  },

  game: {
    accounts: { rewards: "game-rewards" },
  },
});

hive.configs.tests.accounts.minter;   // "test-minter"
hive.configs.game.accounts.rewards;   // "game-rewards"`}
        />
        <Prose>
          <p>
            Names like <code>tests</code>, <code>game</code> or <code>production</code> are your
            concepts, not the SDK&apos;s. TypeScript infers the exact shape you passed, so nested
            access stays typed. You can also declare the shape explicitly:
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`type AppConfig = {
  accounts: { treasury: { accountEnv: string } };
  tests: { accounts: { minter: string } };
};

const hive = new HiveClient<AppConfig>({ /* ... */ });`}
        />
        <Callout tone="info">
          Configuration never carries RPC endpoints — node selection belongs to the RPC system.
        </Callout>
      </DocSection>

      <DocSection id="accounts" title="The accounts key">
        <Prose>
          <p>
            <code>accounts</code> is the one key the SDK reads: it maps developer-defined aliases to
            real Hive accounts, directly or through environment variables, and produces the key-free
            references in <code>hive.accounts</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`hive.accounts.treasury;          // key-free AccountReference
hive.listAccounts();             // ["treasury"]
hive.resolveAccount("treasury"); // { alias, account } — never key material`}
        />
      </DocSection>

      <DocSection id="instances" title="Multiple instances">
        <CodeBlock
          language="typescript"
          code={`const testHive = new HiveClient(testConfig);
const productionHive = new HiveClient(productionConfig);

testHive.configs;
productionHive.configs;`}
        />
        <Prose>
          <p>
            Need different configurations? Create different clients. They share nothing, so there is
            never an ambiguous &quot;current&quot; context.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
