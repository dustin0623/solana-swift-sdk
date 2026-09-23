import { createFileRoute } from "@tanstack/react-router";
import { TokenActionPanel } from "@/components/playground/TokenActionPanel";

export const Route = createFileRoute("/docs/playground/token/transfer")({
  head: () => ({
    meta: [
      { title: "Try it: transfer tokens — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Move Hive Engine token balance between accounts from a backend alias or directly through Hive Keychain.",
      },
      { property: "og:title", content: "Try it: transfer tokens — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine token transfer payload builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <TokenActionPanel action="transfer" />,
});
