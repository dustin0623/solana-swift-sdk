import { createFileRoute } from "@tanstack/react-router";
import { NftActionPanel } from "@/components/playground/NftActionPanel";

export const Route = createFileRoute("/docs/playground/nft/burn")({
  head: () => ({
    meta: [
      { title: "Try it: burn NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Burn Hive Engine NFT instance ids to the null account or a custom destination and preview the contract action.",
      },
      { property: "og:title", content: "Try it: burn NFTs — HiveXPH SDK" },
      { property: "og:description", content: "Interactive Hive Engine NFT burn payload builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NftActionPanel action="burn" />,
});
