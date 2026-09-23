import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { X } from "lucide-react";
import { docsNav } from "../lib/docs-nav";
import { setSidebarOpen, useSidebarOpen } from "../lib/sidebar-store";
import { Button } from "./ui/button";

export function DocsSideNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const open = useSidebarOpen();

  useEffect(() => {
    setSidebarOpen(null);
  }, [pathname]);

  const navigation = (
    <nav aria-label="Documentation" className="space-y-7 px-5 py-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/45">
        Documentation
      </div>
      {docsNav.map((section) => (
        <section key={section.title}>
          <h2 className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
            {section.title}
          </h2>
          <div className="border-l border-sidebar-border">
            {section.items.map((doc) => (
              <Link
                key={doc.slug}
                to="/docs/$slug"
                params={{ slug: doc.slug }}
                onClick={() => setSidebarOpen(null)}
                className="relative block py-1.5 pl-3 pr-2 text-[13px] leading-5 text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
                activeProps={{
                  className:
                    "relative block py-1.5 pl-3 pr-2 text-[13px] font-medium leading-5 text-sidebar-primary before:absolute before:-left-px before:inset-y-0 before:w-px before:bg-sidebar-primary",
                }}
              >
                {doc.title}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <>
      <aside
        className={`nice-scroll sticky top-[6.5rem] hidden h-[calc(100vh-6.5rem)] shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar transition-[width,opacity] duration-200 lg:block ${open === false ? "w-0 overflow-hidden opacity-0" : "w-64"}`}
      >
        <div className="w-64">{navigation}</div>
      </aside>
      {open === true ? (
        <div className="fixed inset-0 top-[6.5rem] z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close documentation navigation"
            className="absolute inset-0 bg-overlay"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="nice-scroll relative h-full w-[min(20rem,88vw)] overflow-y-auto border-r border-sidebar-border bg-sidebar shadow-2xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-label="Close menu"
            >
              <X />
            </Button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}