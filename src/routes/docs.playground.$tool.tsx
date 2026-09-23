import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { DocShell } from "../components/DocShell";
import { DocsSideNav } from "../components/DocsSideNav";
import { ToolPanel } from "../components/playground/ToolPanel";
import { findTool } from "../lib/playground-tools";
import { findDoc } from "../lib/docs";

export const Route = createFileRoute("/docs/playground/$tool")({
  loader: ({ params }) => {
    const tool = findTool(params.tool);
    if (!tool) throw notFound();
    return { id: tool.id };
  },
  head: ({ loaderData }) => {
    const tool = loaderData ? findTool(loaderData.id) : undefined;
    if (!tool) return { meta: [{ title: "Not found — SolanaXPH SDK" }, { name: "robots", content: "noindex" }] };
    const title = `Try it: ${tool.title} — SolanaXPH SDK Playground`;
    return {
      meta: [
        { title },
        { name: "description", content: tool.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: tool.summary },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <DocShell>
      <p className="p-10">That playground does not exist.</p>
    </DocShell>
  ),
  component: ToolPage,
});

function ToolPage() {
  const { id } = Route.useLoaderData();
  const tool = findTool(id)!;
  const related = findDoc(tool.doc);
  return (
    <DocShell>
      <div className="mx-auto flex max-w-[82rem]">
        <DocsSideNav />
        <article className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="max-w-4xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Playground</div>
            <h1 className="doc-title mt-3 font-display font-semibold">Try it: {tool.title}</h1>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{tool.summary}</p>
            {related ? (
              <Link
                to="/docs/$slug"
                params={{ slug: related.slug }}
                className="mt-5 inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="size-3.5" /> Read: {related.title}
              </Link>
            ) : null}
            <div className="mt-8">
              <ToolPanel key={tool.id} id={tool.id} live={tool.live} />
            </div>
          </div>
        </article>
      </div>
    </DocShell>
  );
}
