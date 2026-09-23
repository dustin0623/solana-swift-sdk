import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

type Language = "typescript" | "javascript" | "json" | "bash" | "text";

const KEYWORDS =
  /\b(await|async|const|let|var|import|from|export|return|new|function|if|else|for|of|try|catch|throw|type|interface|class|extends|implements|null|true|false|undefined)\b/g;

/** Very small, dependency-free highlighter: strings, comments, numbers, functions, keywords. */
function highlight(code: string, language: Language): ReactNode {
  if (language === "text") return code;

  const nodes: ReactNode[] = [];
  const pattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*|#[^\n]*)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*\s*(?=\())/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const pushKeyword = (text: string) => (
    <span key={`k${key++}`} className="text-syntax-keyword">
      {text}
    </span>
  );

  const pushPlain = (text: string) => {
    if (!text) return;
    let plainLast = 0;
    let keywordMatch: RegExpExecArray | null;
    KEYWORDS.lastIndex = 0;
    while ((keywordMatch = KEYWORDS.exec(text)) !== null) {
      if (keywordMatch.index > plainLast) {
        nodes.push(text.slice(plainLast, keywordMatch.index));
      }
      nodes.push(pushKeyword(keywordMatch[0]));
      plainLast = keywordMatch.index + keywordMatch[0].length;
    }
    nodes.push(text.slice(plainLast));
  };

  while ((match = pattern.exec(code)) !== null) {
    pushPlain(code.slice(lastIndex, match.index));
    if (match[1]) {
      nodes.push(
        <span key={`s${key++}`} className="text-syntax-string">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      nodes.push(
        <span key={`c${key++}`} className="text-syntax-comment">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      nodes.push(
        <span key={`n${key++}`} className="text-syntax-number">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      nodes.push(
        <span key={`f${key++}`} className="text-syntax-function">
          {match[4]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  pushPlain(code.slice(lastIndex));

  return nodes;
}

const LANGUAGE_LABEL: Record<Language, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  json: "JSON",
  bash: "Shell",
  text: "Text",
};

export interface CodeBlockProps {
  code: string;
  language?: Language;
  filename?: string;
  /** Hide the header bar entirely (inline snippets inside tables etc.). */
  bare?: boolean;
}

export function CodeBlock({ code, language = "typescript", filename, bare }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/^\n+|\n+$/g, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-code-background">
      {!bare && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {filename ?? LANGUAGE_LABEL[language]}
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="Copy code"
            className="flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
        <code>{highlight(trimmed, language)}</code>
      </pre>
    </div>
  );
}

/** ASCII diagram / flow block: monospace, no highlighting, scrollable. */
export function DiagramBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-code-background px-4 py-3 font-mono text-[12px] leading-[1.45] text-muted-foreground">
      {children.replace(/^\n+|\n+$/g, "")}
    </pre>
  );
}
