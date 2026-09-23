import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

interface JsonBlockProps {
  value: unknown;
  label?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  maxHeight?: string;
}

export function JsonBlock({
  value,
  label,
  collapsible = false,
  defaultOpen = true,
  maxHeight = "22rem",
}: JsonBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const text = stringify(value);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-1.5">
      {(label || collapsible) && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => collapsible && setOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            disabled={!collapsible}
          >
            {collapsible ? (
              open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )
            ) : null}
            {label ?? "JSON"}
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {open && (
        <pre className="code-block" style={{ maxHeight, overflowY: "auto" }}>
          {text}
        </pre>
      )}
    </div>
  );
}
