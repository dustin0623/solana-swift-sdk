import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/playground/PageHeader";
import { searchIndex } from "@/lib/docs-nav";

export const Route = createFileRoute("/docs/playground/")({
  head: () => ({
    meta: [
      { title: "Interactive Playground — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Test Hive Custom JSON, Keychain requests, Hive Engine token and NFT issuance, transaction reading, block streaming and raw RPC against the real SDK.",
      },
      { property: "og:title", content: "Interactive Playground — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Run every SDK capability interactively against a live Hive RPC endpoint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaygroundHome,
});

function PlaygroundHome() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Playground"
        title="Interactive Playground"
        description="Every tool below runs the real SDK source from /package-manager — the same builders, parsers and clients an installed package exposes. Nothing is simulated and no transaction result is faked."
      >
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {searchIndex
          .filter((entry) => entry.playground && entry.to !== "/docs/playground")
          .map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-md border border-border bg-card p-4 transition-colors hover:border-accent/50"
            >
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                {item.group}
              </span>
              <span className="mt-1 flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                {item.title}
                <ArrowRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-accent" />
              </span>
              <span className="mt-1.5 block text-[13px] leading-relaxed text-muted-foreground">
                {item.summary}
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
