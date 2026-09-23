import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/nfts/issue")({
  head: () => ({
    meta: [
      { title: "Issue an NFT — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint a single Hive Engine NFT instance with custom properties, from a backend alias or through Hive Keychain.",
      },
      { property: "og:title", content: "Issue an NFT — HiveXPH SDK" },
      { property: "og:description", content: "Mint a Hive Engine NFT instance with properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftIssuePage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function NftIssuePage() {
  return (
    <DocPage
      eyebrow="NFTs"
      title="Issue an NFT"
      description="Mint one instance of a collection into a destination account. Issuance fees are paid in the fee symbol you choose."
      path="/docs/nfts/issue"
      toc={toc}
      playground={{ to: "/docs/playground/nft/issue", label: "Try it: issue an NFT" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>
            Properties are an arbitrary JSON object stored with the instance and must match the data
            properties defined on the collection.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.issue({
  from: hive.accounts.treasury,
  symbol: "TESTNFT",
  account: "bob",
  feeSymbol: "BEE",
  properties: { level: 1, rarity: "rare" },
});

await hive.keychainIssuer.nft.issue({
  username: "alice",
  symbol: "TESTNFT",
  account: "bob",
  feeSymbol: "BEE",
  properties: { level: 1 },
});`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "symbol", type: "string", required: true, description: "Collection symbol." },
            { name: "account", type: "string", required: true, description: "Receiving account." },
            { name: "feeSymbol", type: "string", description: "Token used to pay the issuance fee." },
            { name: "properties", type: "object", description: "Instance properties." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
