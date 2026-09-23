import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { DocShell } from "../components/DocShell";
import { CodeBlock } from "../components/CodeBlock";
import { DOCS, findDoc } from "../lib/docs";

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
  const doc = findDoc(slug)!;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = DOCS.filter(
    (d) =>
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.blocks.some((b) => (b.text ?? b.code ?? b.note ?? "").toLowerCase().includes(q)),
  );
  const groups = [...new Set(DOCS.map((d) => d.group))];
  const index = DOCS.indexOf(doc);
  const prev = DOCS[index - 1];
  const next = DOCS[index + 1];

  return (
    <DocShell>
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            className="mb-4 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          {groups.map((group) => {
            const items = visible.filter((d) => d.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </div>
                {items.map((d) => (
                  <Link
                    key={d.slug}
                    to="/docs/$slug"
                    params={{ slug: d.slug }}
                    className="block rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                    activeProps={{ className: "bg-muted font-medium text-foreground" }}
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </aside>
        <article className="min-w-0 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">{doc.group}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{doc.title}</h1>
          <p className="mt-2 text-muted-foreground">{doc.summary}</p>
          <div className="mt-6">
            {doc.blocks.map((b, i) =>
              b.code ? (
                <CodeBlock key={i} code={b.code} />
              ) : b.note ? (
                <div key={i} className="my-4 rounded-md border-l-4 border-primary bg-muted/50 p-3 text-sm">
                  {b.note}
                </div>
              ) : (
                <p key={i} className="my-3 leading-7">
                  {b.text}
                </p>
              ),
            )}
          </div>
          <div className="mt-10 flex justify-between border-t border-border pt-4 text-sm">
            {prev ? (
              <Link to="/docs/$slug" params={{ slug: prev.slug }} className="text-primary">
                ← {prev.title}
              </Link>
            ) : <span />}
            {next ? (
              <Link to="/docs/$slug" params={{ slug: next.slug }} className="text-primary">
                {next.title} →
              </Link>
            ) : <span />}
          </div>
        </article>
      </div>
    </DocShell>
  );
}
