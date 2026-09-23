import { Link, useRouterState } from "@tanstack/react-router";
import { setSidebarOpen, useSidebarOpen } from "@/lib/sidebar-store";
import { useEffect, useState } from "react";
import { ChevronRight, FlaskConical, PanelLeftClose } from "lucide-react";
import { isGroup, type NavEntry, type NavGroup, type NavItem, type NavSection } from "@/lib/docs-nav";

function ItemLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <li className="-ml-px">
      <Link
        to={item.to}
        onClick={onNavigate}
        activeOptions={{ exact: true }}
        className="flex items-center gap-1.5 border-l-2 border-transparent py-1.5 pl-3 pr-2 text-[13.5px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        activeProps={{ className: "border-primary font-medium text-primary" }}
      >
        {item.playground && <FlaskConical className="size-3 shrink-0 text-accent" />}
        <span>{item.title}</span>
      </Link>
    </li>
  );
}

/** True when the active page lives anywhere inside this group, at any depth. */
function containsPath(entries: NavEntry[], pathname: string): boolean {
  return entries.some((entry) =>
    isGroup(entry) ? containsPath(entry.items, pathname) : entry.to === pathname,
  );
}

function Group({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const containsActive = containsPath(group.items, pathname);
  const [open, setOpen] = useState(containsActive);
  const expanded = open || containsActive;

  return (
    <li className="-ml-px">
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 border-l-2 border-transparent py-1.5 pl-3 pr-2 text-left text-[13.5px] text-foreground transition-colors hover:border-border"
      >
        <span>{group.title}</span>
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {expanded && (
        <ul className="ml-3 border-l border-border">
          <EntryList entries={group.items} pathname={pathname} onNavigate={onNavigate} />
        </ul>
      )}
    </li>
  );
}

/** Renders one level of the tree; groups recurse into themselves. */
function EntryList({
  entries,
  pathname,
  onNavigate,
}: {
  entries: NavEntry[];
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <>
      {entries.map((entry) =>
        isGroup(entry) ? (
          <Group key={entry.title} group={entry} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <ItemLink key={entry.to} item={entry} onNavigate={onNavigate} />
        ),
      )}
    </>
  );
}

function SectionList({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <nav className="space-y-7">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            {section.title}
          </p>
          <ul className="mt-2 border-l border-border">
            <EntryList entries={section.items} pathname={pathname} onNavigate={onNavigate} />
          </ul>
        </div>
      ))}
    </nav>
  );
}


/**
 * Close button used inside the mobile drawer. The expand/collapse toggle
 * itself lives in the top navigation tab strip (see TopNav).
 */
function DrawerCloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Close ${label} navigation`}
      title={`Close ${label} navigation`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <PanelLeftClose className="size-4" />
    </button>
  );
}

/**
 * Sidebar whose collapse toggle lives in the TopNav tab strip.
 * Defaults to open on desktop and closed on smaller screens.
 */
export function SideNav({ sections, label }: { sections: NavSection[]; label: string }) {
  // null = "use the viewport default" (open on desktop, closed on mobile).
  const open = useSidebarOpen();
  const [isMobile, setIsMobile] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const visible = open ?? !isMobile;

  return (
    <>
      {/* Small screens: overlay drawer */}
      {visible && isMobile && (
        <div className="fixed inset-x-0 bottom-0 top-[6.5rem] z-40">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="nice-scroll absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto border-r border-border bg-sidebar p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground">
                {label}
              </span>
              <DrawerCloseButton label={label} onClick={() => setSidebarOpen(false)} />
            </div>
            <SectionList
              sections={sections}
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop: inline collapsible sidebar */}
      {visible && !isMobile && (
        <aside className="hidden w-64 shrink-0 border-r border-border pr-6 md:block">
          <div className="nice-scroll sticky top-[6.5rem] max-h-[calc(100vh-6.5rem)] overflow-y-auto overscroll-contain pb-10 pr-2">
            <p className="mb-2 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/80">
              {label}
            </p>
            <SectionList sections={sections} pathname={pathname} />
          </div>
        </aside>
      )}
    </>
  );
}
