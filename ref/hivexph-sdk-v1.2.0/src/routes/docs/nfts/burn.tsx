import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/nfts/burn")({
  head: () => ({
    meta: [
      { title: "Burn NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Burn Hive Engine NFT instances by sending their ids to the null account or a custom burn destination.",
      },
      { property: "og:title", content: "Burn NFTs — HiveXPH SDK" },
      { property: "og:description", content: "Burn Hive Engine NFT instances permanently." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftBurnPage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function NftBurnPage() {
  return (
    <DocPage
      eyebrow="NFTs"
      title="Burn NFTs"
      description="Burning sends instance ids to a destination nobody controls, defaulting to the Hive account null."
      path="/docs/nfts/burn"
      toc={toc}
      playground={{ to: "/docs/playground/nft/burn", label: "Try it: burn NFTs" }}
    >
      <DocSection id="usage" title="Usage">
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.burn({
  from: hive.accounts.treasury,
  symbol: "TESTNFT",
  id: ["1", "2"],
});

await hive.keychainIssuer.nft.burn({
  username: "alice",
  symbol: "TESTNFT",
  id: ["1"],
});`}
        />
        <Callout tone="warning">Burned instances cannot be recovered.</Callout>
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "symbol", type: "string", required: true, description: "Collection symbol." },
            { name: "id", type: "string[]", required: true, description: "Instance ids to burn." },
            { name: "account", type: "string", description: 'Optional destination, default "null".' },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
