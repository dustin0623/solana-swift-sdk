import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchIndex } from "@/lib/docs-nav";

/** Lightweight local search over documentation and playground pages. No backend. */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    return [
      { kind: "Documentation" as const, entries: searchIndex.filter((e) => e.kind === "Documentation") },
      { kind: "Playground" as const, entries: searchIndex.filter((e) => e.kind === "Playground") },
    ];
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-chrome-border bg-chrome-foreground/10 px-3 py-1.5 text-xs text-chrome-muted transition-colors hover:bg-chrome-foreground/15 hover:text-chrome-foreground sm:w-72"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search documentation...</span>
        <kbd className="ml-auto hidden rounded border border-chrome-border px-1 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation, API reference and playground..." />
        <CommandList>
          <CommandEmpty>No matching pages.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.kind} heading={group.kind}>
              {group.entries.map((entry) => (
                <CommandItem
                  key={entry.to}
                  value={`${entry.title} ${entry.group} ${entry.summary}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({ to: entry.to });
                  }}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {entry.group}
                  </span>
                  <span className="text-sm text-foreground">{entry.title}</span>
                  <span className="text-xs text-muted-foreground">{entry.summary}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
