import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {eyebrow && (
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        )}
        <h1 className="doc-title mt-2 text-foreground">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </header>
  );
}
