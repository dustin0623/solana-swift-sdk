import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { adjacentDocs } from "@/lib/docs-nav";

export interface TocEntry {
  id: string;
  label: string;
}

/** Section heading with a stable anchor id, referenced by the "On this page" list. */
export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>;
}

export function DocPage({
  eyebrow,
  title,
  description,
  path,
  toc = [],
  playground,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** Current route path — drives previous/next navigation. */
  path: string;
  toc?: TocEntry[];
  playground?: { to: string; label: string };
  children: ReactNode;
}) {
  const { previous, next } = adjacentDocs(path);

  return (
    <div className="flex gap-10">
      <article className="min-w-0 flex-1 pb-16">
        <header className="pb-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="doc-title mt-3 text-foreground">{title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          {playground && (
            <Link
              to={playground.to}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent transition-colors hover:bg-accent/20"
            >
              <FlaskConical className="size-3.5" />
              {playground.label}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </header>

        <div className="mt-8 space-y-10">{children}</div>

        <nav className="mt-14 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {previous ? (
            <Link
              to={previous.to}
              className="group rounded-md border border-border px-3 py-2.5 transition-colors hover:border-accent/50 hover:bg-surface"
            >
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <ArrowLeft className="size-3" />
                Previous
              </span>
              <span className="mt-1 block text-sm text-foreground">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={next.to}
              className="group rounded-md border border-border px-3 py-2.5 text-right transition-colors hover:border-accent/50 hover:bg-surface sm:col-start-2"
            >
              <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Next
                <ArrowRight className="size-3" />
              </span>
              <span className="mt-1 block text-sm text-foreground">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      {toc.length > 0 && (
        <aside className="hidden w-56 shrink-0 xl:block">
          <div className="nice-scroll sticky top-26 max-h-[calc(100vh-7rem)] overflow-y-auto pb-10">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              On this page
            </p>
            <ul className="mt-3 border-l border-border">
              {toc.map((entry) => (
                <li key={entry.id} className="-ml-px">
                  <a
                    href={`#${entry.id}`}
                    className="block border-l-2 border-transparent py-1.5 pl-3 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {entry.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
