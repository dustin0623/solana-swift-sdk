import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/nfts/issue-multiple")({
  head: () => ({
    meta: [
      { title: "Issue multiple NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint several Hive Engine NFT instances in a single contract action to save transactions and fees.",
      },
      { property: "og:title", content: "Issue multiple NFTs — HiveXPH SDK" },
      { property: "og:description", content: "Batch mint Hive Engine NFT instances in one action." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftIssueMultiplePage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function NftIssueMultiplePage() {
  return (
    <DocPage
      eyebrow="NFTs"
      title="Issue multiple NFTs"
      description="One contract action mints a list of instances. Each entry carries its own destination, fee symbol and properties."
      path="/docs/nfts/issue-multiple"
      toc={toc}
      playground={{ to: "/docs/playground/nft/issue-multiple", label: "Try it: issue multiple NFTs" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>Instances may target different accounts and carry different properties.</p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.issueMultiple({
  from: hive.accounts.treasury,
  instances: [
    { symbol: "TESTNFT", account: "bob", feeSymbol: "BEE", properties: { level: 1 } },
    { symbol: "TESTNFT", account: "carol", feeSymbol: "BEE", properties: { level: 2 } },
  ],
});

await hive.keychainIssuer.nft.issueMultiple({
  username: "alice",
  instances: [{ symbol: "TESTNFT", account: "bob", feeSymbol: "BEE" }],
});`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "instances", type: "NftMintInstance[]", required: true, description: "One entry per NFT minted." },
            { name: "instances[].symbol", type: "string", required: true, description: "Collection symbol." },
            { name: "instances[].account", type: "string", required: true, description: "Receiving account." },
            { name: "instances[].feeSymbol", type: "string", description: "Fee token for that instance." },
            { name: "instances[].properties", type: "object", description: "Instance properties." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
