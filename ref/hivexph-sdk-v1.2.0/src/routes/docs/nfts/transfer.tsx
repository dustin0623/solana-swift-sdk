import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/nfts/transfer")({
  head: () => ({
    meta: [
      { title: "Transfer NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Transfer Hive Engine NFT instance ids to another account from a backend alias or through Hive Keychain.",
      },
      { property: "og:title", content: "Transfer NFTs — HiveXPH SDK" },
      { property: "og:description", content: "Move Hive Engine NFT instances between accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NftTransferPage,
});

const toc = [
  { id: "usage", label: "Usage" },
  { id: "params", label: "Parameters" },
];

function NftTransferPage() {
  return (
    <DocPage
      eyebrow="NFTs"
      title="Transfer NFTs"
      description="Transfers are grouped per collection: each entry lists a symbol and the instance ids moving to the destination."
      path="/docs/nfts/transfer"
      toc={toc}
      playground={{ to: "/docs/playground/nft/transfer", label: "Try it: transfer NFTs" }}
    >
      <DocSection id="usage" title="Usage">
        <Prose>
          <p>Instance ids are strings, exactly as Hive Engine reports them.</p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.issuer.nft.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  nfts: [{ symbol: "TESTNFT", ids: ["1", "2", "3"] }],
});

await hive.keychainIssuer.nft.transfer({
  username: "alice",
  account: "bob",
  nfts: [{ symbol: "TESTNFT", ids: ["1"] }],
});`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          rows={[
            { name: "from / username", type: "AccountRef | string", required: true, description: "Signing account." },
            { name: "account", type: "string", required: true, description: "Receiving account." },
            { name: "nfts", type: "{ symbol, ids }[]", required: true, description: "Instances grouped by collection." },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
