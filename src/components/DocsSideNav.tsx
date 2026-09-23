import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical, X } from "lucide-react";
import { docsNav, isGroup, type NavEntry, type NavGroup, type NavItem } from "../lib/docs-nav";
import { setSidebarOpen, useSidebarOpen } from "../lib/sidebar-store";
import { Button } from "./ui/button";

function contains(entries: NavEntry[], pathname: string): boolean {
  return entries.some((e) => (isGroup(e) ? contains(e.items, pathname) : e.to === pathname));
}

function ItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const router = useRouter();
  const active = item.to === pathname;
  return (
    <a
      href={item.to}
      onClick={(event) => {
        event.preventDefault();
        setSidebarOpen(null);
        void router.navigate({ href: item.to });
      }}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-1.5 py-1.5 pl-3 pr-2 text-[13px] leading-5 transition-colors ${
        active
          ? "font-medium text-sidebar-primary before:absolute before:-left-px before:inset-y-0 before:w-px before:bg-sidebar-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
      }`}
    >
      {item.playground ? <FlaskConical className="size-3 shrink-0 text-sidebar-primary" /> : null}
      <span>{item.title}</span>
    </a>
  );
}

function Group({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActive = contains(group.items, pathname);
  const [open, setOpen] = useState(hasActive);
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between py-1.5 pl-3 pr-2 text-left text-[13px] font-medium leading-5 transition-colors hover:text-sidebar-foreground ${
          open ? "rounded-md border border-sidebar-foreground/70 text-sidebar-foreground" : "text-sidebar-foreground/85"
        }`}
      >
        <span>{group.title}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open ? (
        <div className="ml-3 mt-1 border-l border-sidebar-border">
          <Entries entries={group.items} pathname={pathname} />
        </div>
      ) : null}
    </div>
  );
}

function Entries({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  return (
    <>
      {entries.map((e) =>
        isGroup(e) ? <Group key={e.title} group={e} pathname={pathname} /> : <ItemLink key={e.to} item={e} pathname={pathname} />,
      )}
    </>
  );
}

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
            <Entries entries={section.items} pathname={pathname} />
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