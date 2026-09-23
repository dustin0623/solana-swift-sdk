import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/account-aliases")({
  head: () => ({
    meta: [
      { title: "Account aliases — HiveXPH SDK" },
      {
        name: "description",
        content:
          "An alias is a stable name in your code that resolves to a real Hive account and signing key at call time, never at import time.",
      },
      { property: "og:title", content: "Account aliases — HiveXPH SDK" },
      {
        property: "og:description",
        content: "How aliases resolve to real Hive accounts and keys, lazily.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountAliasesPage,
});

const toc = [
  { id: "why", label: "Why aliases" },
  { id: "shape", label: "Alias shape" },
  { id: "references", label: "Account references" },
  { id: "resolve", label: "Resolution" },
];

function AccountAliasesPage() {
  return (
    <DocPage
      eyebrow="Configuration"
      title="Account aliases"
      description="Code refers to roles — treasury, minter, rewards — while the real account name lives in the environment. Rotating an account never touches application code."
      path="/docs/account-aliases"
      toc={toc}
      playground={{ to: "/docs/playground/configurations", label: "Resolve an alias" }}
    >
      <DocSection id="why" title="Why aliases">
        <Prose>
          <p>
            Backend operations take <code>from: &quot;treasury&quot;</code>, not a Hive username.
            The alias maps to environment variables, so staging and production differ only by
            configuration.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="shape" title="Alias shape">
        <CodeBlock
          language="typescript"
          code={`accounts: {
  treasury: {
    accountEnv: "HIVE_TREASURY_ACCOUNT",       // resolves to the Hive username
    keyEnv: "HIVE_TREASURY_ACTIVE_KEY",        // resolves to the signing key
  },
}`}
        />
        <ParamTable
          caption="HiveAccountConfig"
          rows={[
            { name: "accountEnv", type: "string", required: true, description: "Environment variable holding the Hive account name." },
            { name: "keyEnv", type: "string", description: "Environment variable holding the private key used for signing." },
          ]}
        />
      </DocSection>

      <DocSection id="references" title="Account references">
        <Prose>
          <p>
            Backend issuer operations never take an alias string. They take the reference object the
            SDK exposes for that alias, so a typo becomes a compile error instead of a runtime one.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`hive.accounts.treasury;                  // default configuration
hive.configs.game.accounts.minter;       // named configuration

await hive.issuer.token.issue({
  from: hive.accounts.treasury,          // AccountReference — not "treasury"
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "10.000",
});`}
        />
        <Callout tone="security">
          An <code>AccountReference</code> carries the alias and the environment variable{" "}
          <em>names</em> only. It never carries a resolved account name or key.
          Hive Keychain is unaffected and still takes <code>username: string</code>.
        </Callout>
      </DocSection>

      <DocSection id="resolve" title="Resolution">
        <CodeBlock
          language="typescript"
          code={`hive.listAccounts();               // ["treasury"]
hive.accounts.treasury;            // AccountReference passed to issuers
hive.resolveAccount("treasury");   // { alias, account } — internal resolution`}
        />
        <Callout tone="security">
          Signing keys are resolved internally, server-side, only when a backend issuer operation
          needs one. A missing key throws a secret-safe error naming the variable — never its
          value.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
