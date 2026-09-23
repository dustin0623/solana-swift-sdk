import { createFileRoute } from "@tanstack/react-router";
import { TokenActionPanel } from "@/components/playground/TokenActionPanel";

export const Route = createFileRoute("/docs/playground/token/issue")({
  head: () => ({
    meta: [
      { title: "Try it: issue tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Mint new units of a Hive Engine token to a destination account and inspect the custom_json payload before broadcasting.",
      },
      { property: "og:title", content: "Try it: issue tokens — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine token issue payload builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <TokenActionPanel action="issue" />,
});
