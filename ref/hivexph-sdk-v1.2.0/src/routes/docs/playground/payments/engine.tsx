import { createFileRoute } from "@tanstack/react-router";
import { PaymentActionPanel } from "@/components/playground/PaymentActionPanel";

export const Route = createFileRoute("/docs/playground/payments/engine")({
  head: () => ({
    meta: [
      { title: "Try it: Hive Engine payments — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Build Hive Engine token payments that carry a standardized action and metadata trigger, then broadcast them with Hive Keychain.",
      },
      { property: "og:title", content: "Try it: Hive Engine payments — HiveXPH SDK" },
      { property: "og:description", content: "Interactive Hive Engine token payment builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PaymentActionPanel rail="engine" />,
});
