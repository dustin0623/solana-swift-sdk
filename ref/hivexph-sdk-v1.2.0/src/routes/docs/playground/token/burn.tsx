import { createFileRoute } from "@tanstack/react-router";
import { TokenActionPanel } from "@/components/playground/TokenActionPanel";

export const Route = createFileRoute("/docs/playground/token/burn")({
  head: () => ({
    meta: [
      { title: "Try it: burn tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Burn Hive Engine tokens to the null account, or to a custom burn destination, and preview the contract action first.",
      },
      { property: "og:title", content: "Try it: burn tokens — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine token burn payload builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <TokenActionPanel action="burn" />,
});
