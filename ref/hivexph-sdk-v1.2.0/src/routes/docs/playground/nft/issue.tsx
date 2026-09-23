import { createFileRoute } from "@tanstack/react-router";
import { NftActionPanel } from "@/components/playground/NftActionPanel";

export const Route = createFileRoute("/docs/playground/nft/issue")({
  head: () => ({
    meta: [
      { title: "Try it: issue an NFT — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint a single Hive Engine NFT instance with custom properties and inspect the contract action before broadcasting.",
      },
      { property: "og:title", content: "Try it: issue an NFT — HiveXPH SDK" },
      { property: "og:description", content: "Interactive Hive Engine NFT issue payload builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NftActionPanel action="issue" />,
});
