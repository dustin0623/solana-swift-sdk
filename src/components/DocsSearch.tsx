import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { DOCS } from "../lib/docs";
import { Button } from "./ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const groups = useMemo(
    () => Array.from(new Set(DOCS.map((doc) => doc.group))).map((group) => ({
      group,
      docs: DOCS.filter((doc) => doc.group === group),
    })),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-8 w-9 justify-start border border-chrome-border bg-chrome-foreground/5 px-2.5 text-chrome-muted hover:bg-chrome-foreground/10 hover:text-chrome-foreground sm:w-72"
        aria-label="Search documentation"
      >
        <Search className="size-3.5" />
        <span className="hidden text-xs font-normal sm:inline">Search documentation...</span>
        <kbd className="ml-auto hidden border border-chrome-border px-1.5 py-0.5 font-mono text-[9px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search documentation and API reference..." />
        <CommandList className="nice-scroll max-h-96">
          <CommandEmpty>No matching pages.</CommandEmpty>
          {groups.map(({ group, docs }) => (
            <CommandGroup key={group} heading={group}>
              {docs.map((doc) => (
                <CommandItem
                  key={doc.slug}
                  value={`${doc.title} ${doc.group} ${doc.summary}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({ to: "/docs/$slug", params: { slug: doc.slug } });
                  }}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="text-sm text-foreground">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{doc.summary}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}