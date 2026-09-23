import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { BookOpen, Boxes, Github, Menu } from "lucide-react";
import { DocsSearch } from "./DocsSearch";
import { Button } from "./ui/button";
import { toggleSidebar, useSidebarOpen } from "../lib/sidebar-store";

interface DocShellProps {
  children: ReactNode;
}

export function DocShell({ children }: DocShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const sidebarOpen = useSidebarOpen();
  const isDocs = pathname.startsWith("/docs/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-chrome text-chrome-foreground">
        <div className="border-b border-chrome-border">
          <div className="mx-auto flex h-14 max-w-[82rem] items-center gap-4 px-4 sm:px-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5 text-sm font-semibold">
              <span className="inline-flex size-7 items-center justify-center rounded bg-primary font-display text-xs font-bold text-primary-foreground">
                SX
              </span>
              <span>solanaxph-sdk</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <DocsSearch />
              <a
                href="https://github.com/solanaxph/solanaxph-sdk"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 text-xs text-chrome-muted transition-colors hover:text-chrome-foreground sm:flex"
              >
                <Github className="size-4" /> GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/solanaxph-sdk"
                target="_blank"
                rel="noreferrer"
                className="hidden font-mono text-xs text-chrome-muted transition-colors hover:text-chrome-foreground md:block"
              >
                NPM
              </a>
            </div>
          </div>
        </div>
        <div className="border-b border-chrome-border">
          <div className="mx-auto flex h-12 max-w-[82rem] items-center overflow-x-auto px-4 sm:px-6">
            {isDocs ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const visibleByDefault = window.matchMedia("(min-width: 1024px)").matches;
                  toggleSidebar(sidebarOpen ?? visibleByDefault);
                }}
                className="mr-4 size-8 shrink-0 border-r border-chrome-border text-chrome-muted hover:bg-chrome-foreground/10 hover:text-chrome-foreground"
                aria-label="Toggle documentation navigation"
              >
                <Menu />
              </Button>
            ) : null}
            <nav aria-label="Primary" className="flex h-full items-center gap-7">
              <Link
                to="/docs/$slug"
                params={{ slug: "introduction" }}
                className="flex h-full items-center gap-2 border-b-2 border-transparent font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-muted transition-colors hover:text-chrome-foreground"
                activeOptions={{ includeSearch: false, exact: false }}
                activeProps={{ className: "flex h-full items-center gap-2 border-b-2 border-primary font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-foreground" }}
              >
                <BookOpen className="size-3.5" /> Docs
              </Link>
              <Link
                to="/docs/$slug"
                params={{ slug: "api-reference" }}
                className="flex h-full items-center gap-2 border-b-2 border-transparent font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-muted transition-colors hover:text-chrome-foreground"
                activeProps={{ className: "flex h-full items-center gap-2 border-b-2 border-primary font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-foreground" }}
              >
                <Boxes className="size-3.5" /> API Reference
              </Link>
              <Link
                to="/playground"
                className="flex h-full items-center border-b-2 border-transparent font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-muted transition-colors hover:text-chrome-foreground"
                activeProps={{ className: "flex h-full items-center border-b-2 border-primary font-mono text-[10px] uppercase tracking-[0.18em] text-chrome-foreground" }}
              >
                Playground
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
