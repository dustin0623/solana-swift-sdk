import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui/button";

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|`[^`]*`|\b(?:import|from|const|await|new|if|return|export|async|type)\b|\b\d[\d_]*n?\b)/g;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of code.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > last) out.push(code.slice(last, index));
    const cls =
      token.startsWith("//") || token.startsWith("#")
        ? "text-muted-foreground italic"
        : token.startsWith('"') || token.startsWith("`")
          ? "text-primary"
          : /^\d/.test(token)
            ? "text-accent-foreground"
            : "font-semibold text-foreground";
    out.push(
      <span key={key++} className={cls}>
        {token}
      </span>,
    );
    last = index + token.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block group relative my-4 overflow-hidden rounded border border-border bg-code">
      <div className="flex h-8 items-center justify-between border-b border-border bg-surface px-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">TypeScript</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="h-6 gap-1 px-1.5 font-mono text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy"}
      </Button>
      </div>
      <pre className="nice-scroll overflow-x-auto p-4 text-[12px] leading-6 font-mono text-code-foreground">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
