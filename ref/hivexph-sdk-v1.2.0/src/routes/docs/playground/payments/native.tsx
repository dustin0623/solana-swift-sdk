import { createFileRoute } from "@tanstack/react-router";
import { PaymentActionPanel } from "@/components/playground/PaymentActionPanel";

export const Route = createFileRoute("/docs/playground/payments/native")({
  head: () => ({
    meta: [
      { title: "Try it: native HIVE payments — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Build HIVE and HBD transfers that carry a standardized action and metadata trigger, then broadcast them with Hive Keychain.",
      },
      { property: "og:title", content: "Try it: native HIVE payments — HiveXPH SDK" },
      { property: "og:description", content: "Interactive HIVE and HBD payment builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PaymentActionPanel rail="native" />,
});
