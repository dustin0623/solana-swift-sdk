import { createFileRoute } from "@tanstack/react-router";
import { TokenActionPanel } from "@/components/playground/TokenActionPanel";

export const Route = createFileRoute("/docs/playground/token/create")({
  head: () => ({
    meta: [
      { title: "Try it: create a token — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Run the Hive Engine token creation flow: required name, symbol, precision and max supply, with the BEE balance and symbol availability preflight.",
      },
      { property: "og:title", content: "Try it: create a token — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Interactive Hive Engine token creation with BEE and symbol checks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <TokenActionPanel action="create" />,
});
