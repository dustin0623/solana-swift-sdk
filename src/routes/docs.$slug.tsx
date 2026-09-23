import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { DocShell } from "../components/DocShell";
import { DocsSideNav } from "../components/DocsSideNav";
import { CodeBlock } from "../components/CodeBlock";
import { findDoc } from "../lib/docs";
import { adjacentDocs } from "../lib/docs-nav";

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const doc = findDoc(params.slug);
    if (!doc) throw notFound();
    return { slug: doc.slug };
  },
  head: ({ loaderData }) => {
    const doc = loaderData ? findDoc(loaderData.slug) : undefined;
    if (!doc) return { meta: [{ title: "Not found — SolanaXPH SDK" }, { name: "robots", content: "noindex" }] };
    const title = `${doc.title} — SolanaXPH SDK Docs`;
    return {
      meta: [
        { title },
        { name: "description", content: doc.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: doc.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: DocNotFound,
  component: DocPage,
});

function DocNotFound() {
  return (
    <DocShell>
      <p>That page does not exist.</p>
      <Link to="/docs/$slug" params={{ slug: "introduction" }} className="text-primary underline">
        Go to the introduction
      </Link>
    </DocShell>
  );
}

function DocPage() {
  const { slug } = Route.useLoaderData();
  const doc = findDoc(slug);
  if (!doc) return null;
  const { previous, next } = adjacentDocs(slug);
  const sections = doc.blocks
    .map((block, index) => ({ block, index, title: block.title ?? (index === 0 ? "Overview" : undefined) }))
    .filter((entry): entry is typeof entry & { title: string } => Boolean(entry.title));

  return (
    <DocShell>
      <div className="mx-auto flex max-w-[82rem]">
        <DocsSideNav />
        <div className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-10 lg:py-12 xl:grid xl:grid-cols-[minmax(0,1fr)_11rem] xl:gap-12">
          <article className="mx-auto min-w-0 w-full max-w-3xl xl:mx-0">
            <header>
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-primary">{doc.group}</div>
              <h1 className="doc-title mt-3 font-display font-semibold">{doc.title}</h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">{doc.summary}</p>
              <Link
                to="/playground"
                className="mt-5 inline-flex items-center gap-2 rounded border border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-primary/10"
              >
                <FlaskConical className="size-3.5" /> Open the playground <ArrowRight className="size-3.5" />
              </Link>
            </header>
            <div className="mt-12 space-y-7">
              {doc.blocks.map((block, index) => {
                const title = block.title ?? (index === 0 ? "Overview" : undefined);
                return (
                  <section key={index} id={title ? `section-${index}` : undefined} className="scroll-mt-32">
                    {title ? <h2 className="mb-3 font-display text-lg font-semibold text-foreground">{title}</h2> : null}
                    {block.code ? (
                      <CodeBlock code={block.code} />
                    ) : block.note ? (
                      <div className="border-l-2 border-primary bg-surface px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {block.note}
                      </div>
                    ) : (
                      <p className="text-[15px] leading-7 text-muted-foreground">{block.text}</p>
                    )}
                  </section>
                );
              })}
            </div>
            <nav aria-label="Documentation pagination" className="mt-16 grid grid-cols-2 gap-4 border-t border-border pt-6">
              {previous ? (
                <Link to="/docs/$slug" params={{ slug: previous.slug }} className="group text-sm text-muted-foreground hover:text-foreground">
                  <span className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em]"><ArrowLeft className="size-3" /> Previous</span>
                  <span className="text-foreground group-hover:text-primary">{previous.title}</span>
                </Link>
              ) : <span />}
              {next ? (
                <Link to="/docs/$slug" params={{ slug: next.slug }} className="group text-right text-sm text-muted-foreground hover:text-foreground">
                  <span className="mb-1 flex items-center justify-end gap-1 font-mono text-[9px] uppercase tracking-[0.16em]">Next <ArrowRight className="size-3" /></span>
                  <span className="text-foreground group-hover:text-primary">{next.title}</span>
                </Link>
              ) : <span />}
            </nav>
          </article>
          <aside className="sticky top-[8rem] hidden h-fit border-l border-border pl-4 xl:block">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">On this page</div>
            <nav className="space-y-2">
              {sections.map(({ index, title }) => (
                <a key={index} href={`#section-${index}`} className="block text-xs leading-5 text-muted-foreground transition-colors hover:text-primary">
                  {title}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </DocShell>
  );
}
