import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/tokens/create")({
  head: () => ({
    meta: [
      { title: "Create a token — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Create a Hive Engine token from a backend or Hive Keychain. Name, symbol, precision and max supply are required; the BEE balance and symbol availability are checked first.",
      },
      { property: "og:title", content: "Create a token — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Hive Engine token creation with BEE balance and duplicate symbol checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenCreatePage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "checks", label: "Preflight checks" },
  { id: "params", label: "Parameters" },
];

function TokenCreatePage() {
  return (
    <DocPage
      eyebrow="Tokens"
      title="Create a token"
      description="Creating a token costs a non-refundable BEE fee, so the SDK verifies the balance and the symbol before anything is signed."
      path="/docs/tokens/create"
      toc={toc}
      playground={{ to: "/docs/playground/token/create", label: "Try it: create a token" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>
            Token name, token symbol, decimal precision and max supply are the only required values.
            The website is optional and can be added or changed later in the TribalDex Token Manager.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Browser — Keychain signs with the active authority
await hive.keychainIssuer.token.create({
  username: "alice",
  symbol: "MYTOKEN",
  name: "My Token",
  precision: 3,
  maxSupply: "1000000",
  url: "https://mytoken.gg", // optional
});

// Backend — the configuration alias signs
await hive.issuer.token.create({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  name: "My Token",
  precision: 3,
  maxSupply: "1000000",
});

// Offline payload preview — no network, no checks
hive.keychainIssuer.token.buildCreate({
  symbol: "MYTOKEN", name: "My Token", precision: 3, maxSupply: "1000000",
});`}
        />
      </DocSection>

      <DocSection id="checks" title="Preflight checks">
        <Prose>
          <p>
            <code>create()</code> compares the signing account&apos;s BEE balance against the
            sidechain creation fee and checks whether the symbol already exists. A failing check
            throws <code>INSUFFICIENT_BEE</code> or <code>TOKEN_ALREADY_EXISTS</code> before
            Keychain opens or a private key is resolved.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const check = await hive.keychainIssuer.token.checkCreate({ username: "alice", symbol: "MYTOKEN" });
// { fee: "100", balance: "8.454", hasEnoughBee: false, symbolExists: false, ok: false, issues: [...] }`}
        />
        <Callout tone="warning">
          Pass <code>skipChecks: true</code> only when you have already verified the balance and the
          symbol yourself — the creation fee is never refunded.
        </Callout>
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "symbol", type: "string", required: true, description: "Uppercase letters, max 10." },
            { name: "name", type: "string", required: true, description: "Max 50 characters." },
            { name: "precision", type: "number", required: true, description: "0 to 8 decimals." },
            { name: "maxSupply", type: "string", required: true, description: "1 to 9007199254740991." },
            { name: "url", type: "string", description: "Optional website, editable later." },
            { name: "skipChecks", type: "boolean", description: "Skip the BEE and symbol preflight." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
