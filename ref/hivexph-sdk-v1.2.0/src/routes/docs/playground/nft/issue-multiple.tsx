import { createFileRoute } from "@tanstack/react-router";
import { NftActionPanel } from "@/components/playground/NftActionPanel";

export const Route = createFileRoute("/docs/playground/nft/issue-multiple")({
  head: () => ({
    meta: [
      { title: "Try it: issue multiple NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint several Hive Engine NFT instances in one contract action and preview the batched custom_json payload.",
      },
      { property: "og:title", content: "Try it: issue multiple NFTs — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine batched NFT issue payload builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NftActionPanel action="issue-multiple" />,
});
