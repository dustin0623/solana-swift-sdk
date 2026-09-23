import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/nfts/create")({
  head: () => ({
    meta: [
      { title: "Create an NFT collection — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Create a Hive Engine NFT collection. Only name and symbol are required; the SDK checks the BEE balance and symbol availability before signing.",
      },
      { property: "og:title", content: "Create an NFT collection — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Hive Engine NFT collection creation with BEE and symbol checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftCreatePage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "checks", label: "Preflight checks" },
  { id: "params", label: "Parameters" },
];

function NftCreatePage() {
  return (
    <DocPage
      eyebrow="NFTs"
      title="Create an NFT collection"
      description="Collection creation costs BEE and follows the same flow as token creation: check the balance and the symbol, then sign."
      path="/docs/nfts/create"
      toc={toc}
      playground={{ to: "/docs/playground/nft/create", label: "Try it: create a collection" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>
            Only the NFT name and symbol are required. Organization, product name, max supply,
            website and authorized issuers are optional and can be updated later in the TribalDex
            NFT manager.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.keychainIssuer.nft.create({
  username: "alice",
  name: "Test Collection",
  symbol: "TESTNFT",
  orgName: "HiveXPH",              // optional
  productName: "Cards",            // optional
  maxSupply: "1000",               // optional, unlimited when omitted
  website: "https://example.com",  // optional
  authorizedIssuingAccounts: ["alice"],   // optional
  authorizedIssuingContracts: [],         // optional
});

await hive.issuer.nft.create({
  from: hive.accounts.treasury,
  name: "Test Collection",
  symbol: "TESTNFT",
});`}
        />
      </DocSection>

      <DocSection id="checks" title="Preflight checks">
        <Prose>
          <p>
            A failing check throws <code>INSUFFICIENT_BEE</code> or <code>NFT_ALREADY_EXISTS</code>{" "}
            before Keychain opens or a key is resolved.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const check = await hive.keychainIssuer.nft.checkCreate({ username: "alice", symbol: "TESTNFT" });
// { fee: "100", balance: "8.45", hasEnoughBee: false, symbolExists: false, ok: false, issues: [...] }`}
        />
        <Callout tone="warning">
          <code>skipChecks: true</code> bypasses both checks — the 100 BEE fee is not refunded if
          the creation fails.
        </Callout>
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "name", type: "string", required: true, description: "Max 50 characters." },
            { name: "symbol", type: "string", required: true, description: "Uppercase letters." },
            { name: "orgName", type: "string", description: "Optional organization name." },
            { name: "productName", type: "string", description: "Optional product name." },
            { name: "maxSupply", type: "string", description: "Optional; unlimited when omitted." },
            { name: "website", type: "string", description: "Optional collection website." },
            {
              name: "authorizedIssuingAccounts",
              type: "string[]",
              description: "Optional accounts allowed to issue.",
            },
            {
              name: "authorizedIssuingContracts",
              type: "string[]",
              description: "Optional contracts allowed to issue.",
            },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
