import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

interface DocShellProps {
  children: ReactNode;
}

export function DocShell({ children }: DocShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
              S
            </span>
            SolanaXPH SDK
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link to="/playground" className="text-muted-foreground hover:text-foreground transition-colors">
              Playground
            </Link>
            <a
              href="https://github.com/solanaxph/sdk"
              className="text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>
    </div>
  );
}
