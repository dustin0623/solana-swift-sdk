import { createFileRoute } from "@tanstack/react-router";
import { NftActionPanel } from "@/components/playground/NftActionPanel";

export const Route = createFileRoute("/docs/playground/nft/create")({
  head: () => ({
    meta: [
      { title: "Try it: create an NFT collection — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Create a Hive Engine NFT collection with the required name and symbol, optional metadata, and the BEE balance and symbol preflight.",
      },
      { property: "og:title", content: "Try it: create an NFT collection — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine NFT collection creation with preflight checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <NftActionPanel action="create" />,
});
