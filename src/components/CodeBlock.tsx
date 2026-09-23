import { useState, type ReactNode } from "react";

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
    <div className="group relative my-4 rounded-lg border border-border bg-muted">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-2 top-2 rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 pr-16 text-[13px] leading-relaxed font-mono text-muted-foreground">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
