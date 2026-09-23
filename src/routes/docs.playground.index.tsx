import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, ArrowRight } from "lucide-react";
import { DocShell } from "../components/DocShell";
import { DocsSideNav } from "../components/DocsSideNav";
import { PLAYGROUND_TOOLS } from "../lib/playground-tools";

export const Route = createFileRoute("/docs/playground/")({
  head: () => ({
    meta: [
      { title: "Playground overview — SolanaXPH SDK Docs" },
      { name: "description", content: "Interactive, read-only SolanaXPH playground: RPC, accounts, transactions, tokens, payments, trading and PDAs." },
      { property: "og:title", content: "Playground overview — SolanaXPH SDK Docs" },
      { property: "og:description", content: "Try the SolanaXPH SDK in your browser. No keys, no seed phrases, no broadcasts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlaygroundOverview,
});

function PlaygroundOverview() {
  return (
    <DocShell>
      <div className="mx-auto flex max-w-[82rem]">
        <DocsSideNav />
        <article className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Getting started</div>
            <h1 className="doc-title mt-3 font-display font-semibold">Playground overview</h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Each "Try it" page sits next to the docs it demonstrates. Live tools make read-only calls to public Solana RPC;
              the rest run on fixtures and a mock RPC. No keys, no seed phrases, no broadcasts.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PLAYGROUND_TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to="/docs/playground/$tool"
                params={{ tool: tool.id }}
                className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/60"
              >
                <div className="flex items-center gap-2 font-medium">
                  <FlaskConical className="size-4 text-primary" /> {tool.title}
                  <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">{tool.live ? "live RPC" : "mock"}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tool.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                  Open <ArrowRight className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </DocShell>
  );
}
