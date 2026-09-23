import { createFileRoute } from "@tanstack/react-router";
import { NftActionPanel } from "@/components/playground/NftActionPanel";

export const Route = createFileRoute("/docs/playground/nft/transfer")({
  head: () => ({
    meta: [
      { title: "Try it: transfer NFTs — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Transfer Hive Engine NFT instance ids to another account from a backend alias or through Hive Keychain.",
      },
      { property: "og:title", content: "Try it: transfer NFTs — HiveXPH SDK" },
      { property: "og:description", content: "Interactive Hive Engine NFT transfer payload builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NftActionPanel action="transfer" />,
});
