import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/environment-variables")({
  head: () => ({
    meta: [
      { title: "Environment variables — HiveXPH SDK" },
      {
        name: "description",
        content:
          "accountEnv, keyEnv and the injectable environment resolver that keeps the SDK runtime-agnostic across Node, edge and worker runtimes.",
      },
      { property: "og:title", content: "Environment variables — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Runtime-agnostic environment resolution for accounts and signing keys.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnvironmentVariablesPage,
});

const toc = [
  { id: "model", label: "The model" },
  { id: "resolver", label: "Custom resolver" },
  { id: "errors", label: "Missing variables" },
];

function EnvironmentVariablesPage() {
  return (
    <DocPage
      eyebrow="Configuration"
      title="Environment variables"
      description="The SDK reads no globals of its own. An injectable resolver supplies values, so the same code works in Node, Cloudflare Workers, Deno or a test harness."
      path="/docs/environment-variables"
      toc={toc}
    >
      <DocSection id="model" title="The model">
        <CodeBlock
          language="bash"
          filename=".env"
          code={`HIVE_TREASURY_ACCOUNT=my-treasury
HIVE_TREASURY_ACTIVE_KEY=5J...`}
        />
        <Prose>
          <p>
            Values are read lazily: creating a client, a configuration or a preview never touches
            the environment. Only an actual signing call does.
          </p>
        </Prose>
        <Callout tone="security">
          Key variables must never be prefixed with a bundler&apos;s public prefix (such as{" "}
          <code>VITE_</code>). They belong to the server runtime only.
        </Callout>
      </DocSection>

      <DocSection id="resolver" title="Custom resolver">
        <CodeBlock
          language="typescript"
          code={`import { HiveClient, createEnvironmentResolver } from "hivexph-sdk";

const hive = new HiveClient({
  environment: createEnvironmentResolver((name) => secretsMap[name]),
  accounts: {
    treasury: { accountEnv: "HIVE_TREASURY_ACCOUNT", keyEnv: "HIVE_TREASURY_ACTIVE_KEY" },
  },
});`}
        />
      </DocSection>

      <DocSection id="errors" title="Missing variables">
        <CodeBlock
          language="typescript"
          code={`try {
  await hive.issuer.token.issue({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "1" });
} catch (error) {
  // HiveEnvironmentVariableMissingError:
  // Environment variable "HIVE_TREASURY_ACTIVE_KEY" is not set
}`}
        />
        <Prose>
          <p>
            Errors name the variable, never its value, so they are safe to log and safe to surface
            in an operator dashboard.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
