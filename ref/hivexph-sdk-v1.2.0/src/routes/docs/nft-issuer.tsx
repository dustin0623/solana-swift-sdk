import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/nft-issuer")({
  head: () => ({
    meta: [
      { title: "NFT issuer — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Issue a single NFT, issue many in one action, transfer and burn instances on Hive Engine from a backend alias or through Hive Keychain.",
      },
      { property: "og:title", content: "NFT issuer — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Hive Engine NFT issue, issueMultiple, transfer and burn operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftIssuerPage,
});

const toc = [
  { id: "create", label: "Create" },
  { id: "issue", label: "Issue" },
  { id: "multiple", label: "Issue multiple" },
  { id: "transfer", label: "Transfer" },
  { id: "burn", label: "Burn" },
  { id: "params", label: "Parameters" },
];

function NftIssuerPage() {
  return (
    <DocPage
      eyebrow="Issuance"
      title="NFT issuer"
      description="The nft contract issues instances with arbitrary properties and optional locked assets. Instance limits are validated before anything is signed."
      path="/docs/nft-issuer"
      toc={toc}
      playground={{ to: "/docs/playground/nft/create", label: "Try it: create a collection" }}
    >
      <DocSection id="create" title="Create">
        <Prose>
          Creating an NFT collection costs 100 BEE. Only <code>name</code> and <code>symbol</code>{" "}
          are required. <code>orgName</code>, <code>productName</code>, <code>maxSupply</code>,{" "}
          <code>website</code>, <code>authorizedIssuingAccounts</code> and{" "}
          <code>authorizedIssuingContracts</code> are optional and can be set later in the TribalDex
          NFT manager.
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Server side (alias + key)
await hive.issuer.nft.create({
  from: game.accounts.minter,
  name: "Hero Collection",
  symbol: "HERO",
  maxSupply: "10000",      // optional, unlimited when omitted
  website: "https://example.com", // optional
});

// Browser side (Hive Keychain, active authority)
await hive.keychainIssuer.nft.create({
  username: "alice",
  name: "Hero Collection",
  symbol: "HERO",
});

// Read-only preflight and offline payload preview
const check = await hive.issuer.nft.checkCreate({ from: game.accounts.minter, name: "Hero Collection", symbol: "HERO" });
// { fee, balance, hasEnoughBee, symbolExists, ok, issues }
const payload = hive.keychainIssuer.nft.buildCreate({ name: "Hero Collection", symbol: "HERO" });`}
        />
        <Callout tone="warning" title="Preflight before signing">
          Both paths check the BEE balance against the NFT creation fee and whether the symbol
          already exists. A failure throws <code>INSUFFICIENT_BEE</code> or{" "}
          <code>NFT_ALREADY_EXISTS</code> before Keychain opens or a key is resolved. Pass{" "}
          <code>skipChecks: true</code> to skip the lookups.
        </Callout>
      </DocSection>

      <DocSection id="issue" title="Issue">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.issue({
  from: game.accounts.minter,
  symbol: "HERO",
  account: "bob",
  feeSymbol: "PAL",
  properties: { level: 1, rarity: "epic" },
});`}
        />
      </DocSection>

      <DocSection id="multiple" title="Issue multiple">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.issueMultiple({
  from: game.accounts.minter,
  instances: [
    { symbol: "HERO", account: "bob", feeSymbol: "PAL", properties: { level: 1 } },
    { symbol: "HERO", account: "carol", feeSymbol: "PAL", properties: { level: 2 } },
  ],
});`}
        />
        <Callout tone="warning">
          A single <code>issueMultiple</code> action is capped by{" "}
          <code>NFT_MAX_ISSUE_MULTIPLE_INSTANCES</code>. Exceeding it throws before signing.
        </Callout>
      </DocSection>

      <DocSection id="transfer" title="Transfer">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.transfer({
  from: game.accounts.minter,
  account: "bob",
  nfts: [{ symbol: "HERO", ids: ["1", "2", "3"] }],
});

hive.issuer.nft.countInstances({ nfts: [{ symbol: "HERO", ids: ["1", "2"] }] }); // 2`}
        />
        <Prose>
          <p>
            The Keychain equivalent lives on <code>hive.keychainIssuer.nft</code> and takes{" "}
            <code>username</code> instead of <code>from</code>.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="burn" title="Burn">
        <Prose>
          <p>
            A burn is a transfer to a destination nobody controls. It defaults to the Hive account{" "}
            <code>null</code>; pass <code>account</code> to send the instances somewhere else.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.burn({
  from: game.accounts.minter,
  symbol: "HERO",
  id: ["1", "2"], // one id or several
});

// Custom burn destination
await hive.issuer.nft.burn({
  from: game.accounts.minter,
  symbol: "HERO",
  id: "1",
  account: "graveyard",
});

// Keychain equivalent
await hive.keychainIssuer.nft.burn({ username: "alice", symbol: "HERO", id: "1" });`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          caption="NFT operation input"
          rows={[
            { name: "from", type: "string", required: true, description: "Backend only: configuration account alias that signs." },
            { name: "symbol", type: "string", required: true, description: "NFT symbol being issued." },
            { name: "account", type: "string", required: true, description: "Destination account or contract." },
            { name: "feeSymbol", type: "string", required: true, description: "Token symbol used to pay the issuance fee." },
            { name: "accountType", type: '"user" | "contract"', description: 'Destination type. Defaults to "user".' },
            { name: "properties", type: "Record<string, unknown>", description: "Arbitrary instance properties." },
            { name: "lockTokens", type: "Record<string, string>", description: "Tokens locked inside the instance at issuance." },
            { name: "lockNfts", type: "{ symbol, ids }[]", description: "NFT instances locked inside the issued instance." },
            { name: "nfts", type: "{ symbol, ids }[]", description: "Transfer only: instances to move." },
            { name: "id", type: "string | string[]", description: "Burn only: instance id(s) to burn." },
            { name: "account (burn)", type: "string", description: 'Burn only: optional destination. Defaults to the Hive account "null".' },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
