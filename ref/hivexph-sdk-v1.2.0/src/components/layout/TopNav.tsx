import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Code2, Github, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { PACKAGE_LINKS, SITE } from "@/lib/site-config";
import { toggleSidebar, useSidebarOpen } from "@/lib/sidebar-store";
import { SearchDialog } from "./SearchDialog";

const primaryNav = [
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/docs/api-reference", label: "API Reference", icon: Code2 },
] as const;

/**
 * Sidebar collapse toggle in the tab strip, left of the Docs tab —
 * Solana-docs style. Only shown on the docs / playground sections.
 */
function SidebarToggle() {
  const open = useSidebarOpen();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!pathname.startsWith("/docs")) {
    return null;
  }

  const visible = open ?? !isMobile;
  const Icon = visible ? PanelLeftClose : PanelLeftOpen;
  const label = visible ? "Collapse sidebar" : "Expand sidebar";

  return (
    <button
      type="button"
      onClick={() => toggleSidebar(visible)}
      aria-label={label}
      title={label}
      className="mr-1 inline-flex shrink-0 items-center justify-center text-chrome-muted transition-colors hover:text-chrome-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="size-4" />
    </button>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-50">
      {/* Dark chrome bar: brand, search and external links */}
      <div className="bg-chrome text-chrome-foreground">
        <div className="mx-auto flex h-14 max-w-[92rem] items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img
              src="/assets/logo.png"
              alt="HiveXPH SDK"
              className="size-7 rounded object-contain"
            />
            <span className="text-[15px] font-semibold tracking-tight text-chrome-foreground">
              hivexph
              <span className="text-chrome-muted">-sdk</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <SearchDialog />
            {PACKAGE_LINKS.github && (
              <a
                href={PACKAGE_LINKS.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub repository"
                title="GitHub repository"
                className="inline-flex shrink-0 items-center justify-center text-chrome-muted transition-colors hover:text-chrome-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Github className="size-5" />
              </a>
            )}
            {PACKAGE_LINKS.npm && (
              <a
                href={PACKAGE_LINKS.npm}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-chrome-muted transition-colors hover:text-chrome-foreground"
              >
                NPM
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Section tab strip: underlined areas, Solana-docs style */}
      <div className="border-y border-chrome-border bg-chrome/95 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[92rem] items-center gap-6 overflow-x-auto px-4 sm:px-6">
          <SidebarToggle />
          <span className="h-4 w-px shrink-0 bg-chrome-border" aria-hidden="true" />
          <div className="flex items-center gap-7">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group inline-flex h-full shrink-0 items-center gap-2 border-b-2 border-transparent text-[11.5px] font-semibold uppercase tracking-[0.16em] text-chrome-muted transition-colors hover:text-chrome-foreground"
                  activeProps={{
                    className: "border-primary text-chrome-foreground",
                  }}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <span className="sr-only">{SITE.subtitle}</span>
    </header>
  );
}
