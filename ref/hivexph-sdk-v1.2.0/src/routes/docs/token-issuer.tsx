import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/token-issuer")({
  head: () => ({
    meta: [
      { title: "Token issuer — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint, transfer and burn Hive Engine tokens from a backend with account aliases, or directly from the browser through Hive Keychain.",
      },
      { property: "og:title", content: "Token issuer — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Hive Engine token mint, transfer and burn from backend or Keychain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenIssuerPage,
});

const toc = [
  { id: "create", label: "Create a token" },
  { id: "backend", label: "Backend API" },
  { id: "keychain", label: "Keychain API" },
  { id: "params", label: "Parameters" },
  { id: "create-params", label: "Create parameters" },
];

function TokenIssuerPage() {
  return (
    <DocPage
      eyebrow="Issuance"
      title="Token issuer"
      description="The tokens contract exposes three operations. Backend calls take an alias; Keychain calls take a username. Both emit the same contract action."
      path="/docs/token-issuer"
      toc={toc}
      playground={{ to: "/docs/playground/token/create", label: "Try it: create a token" }}
    >
      <DocSection id="create" title="Create a token">
        <Prose>
          <p>
            Creating a token costs BEE and every symbol on Hive Engine is unique, so{" "}
            <code>create()</code> always runs two checks first: the signing account&apos;s BEE
            balance against the sidechain creation fee, and whether the symbol already exists. A
            failing check throws <code>INSUFFICIENT_BEE</code> or <code>TOKEN_ALREADY_EXISTS</code>{" "}
            before Keychain opens or a private key is resolved — the non-refundable fee is never
            spent on a creation that cannot succeed.
          </p>
          <p>
            Only token name, token symbol, decimal precision and max supply are required to create a
            token. Website is optional and can be added or updated later in TribalDex Token Manager.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Browser — Keychain signs with the active authority
await hive.keychainIssuer.token.create({
  username: "alice",
  symbol: "MYTOKEN",      // uppercase letters, max 10
  name: "My Token",       // max 50 letters, digits and spaces
  precision: 3,           // 0 to 8
  maxSupply: "1000000",   // always a string
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

// Read-only: what the checks see, without creating anything
const check = await hive.keychainIssuer.token.checkCreate({ username: "alice", symbol: "MYTOKEN" });
// { fee: "100", balance: "8.45434186", hasEnoughBee: false, symbolExists: false, ok: false, issues: [...] }

// Offline payload preview — no network, no checks
hive.keychainIssuer.token.buildCreate({ symbol: "MYTOKEN", name: "My Token", precision: 3, maxSupply: "1000000" });`}
        />
        <Callout tone="warning">
          Pass <code>skipChecks: true</code> only when you have already verified the balance and the
          symbol yourself. Without the checks a doomed creation still costs the BEE fee.
        </Callout>
      </DocSection>

      <DocSection id="backend" title="Backend API">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.token.issue({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "10" });
await hive.issuer.token.transfer({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "5" });
// Burn = transfer to the burn destination. Defaults to the Hive account "null".
await hive.issuer.token.burn({ from: hive.accounts.treasury, symbol: "MYTOKEN", quantity: "1" });
// Custom burn destination
await hive.issuer.token.burn({ from: hive.accounts.treasury, symbol: "MYTOKEN", quantity: "1", account: "graveyard" });

// Offline previews
hive.issuer.token.buildIssue({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "10" });`}
        />
      </DocSection>

      <DocSection id="keychain" title="Keychain API">
        <CodeBlock
          language="typescript"
          code={`await hive.keychainIssuer.token.issue({
  username: "alice",
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "10",
});

// Build only — inspect before prompting the user
const action = hive.keychainIssuer.token.buildBurn({ symbol: "MYTOKEN", quantity: "1" });
// -> tokens.transfer to "null" (pass account: "graveyard" to override)`}
        />
        <Prose>
          <p>
            Keychain calls never accept an alias and never read an environment variable — the
            browser account signs itself.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          caption="Token operation input"
          rows={[
            { name: "from", type: "string", required: true, description: "Backend only: configuration account alias that signs." },
            { name: "username", type: "string", required: true, description: "Keychain only: Hive account signing in the extension." },
            { name: "symbol", type: "string", required: true, description: "Hive Engine token symbol." },
            { name: "account", type: "string", required: true, description: "Destination account (mint and transfer)." },
            { name: "account (burn)", type: "string", description: 'Optional burn destination. Defaults to the Hive account "null".' },
            { name: "quantity", type: "string", required: true, description: "Amount as a string — never a float." },
            { name: "memo", type: "string", description: "Optional memo attached to the contract payload." },
            { name: "id", type: "string", description: "Overrides the ssc-mainnet-hive custom_json id." },
          ]}
        />
      </DocSection>

      <DocSection id="create-params" title="Create parameters">
        <ParamTable
          caption="Token creation input"
          rows={[
            { name: "symbol", type: "string", required: true, description: "Token symbol. Should be uppercase, maximum 10 characters, and must not exist yet." },
            { name: "name", type: "string", required: true, description: "Token name. Maximum of 50 characters are allowed." },
            { name: "precision", type: "number", required: true, description: "Decimal precision. Must be between 0 and 8." },
            { name: "maxSupply", type: "string", required: true, description: "Max supply. Must be between 1 and 9007199254740991." },
            { name: "url", type: "string", description: "Optional website, maximum 255 characters. It can be updated later in TribalDex Token Manager." },
            { name: "skipChecks", type: "boolean", description: "Skips the BEE balance and existing symbol preflight. Off by default." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
