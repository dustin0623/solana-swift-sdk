/**
 * Shared field styling and small building blocks for the per-action
 * playground panels. Every action console (token create, nft transfer, …)
 * renders the same input chrome so the docs feel like one product.
 */
import type { ReactNode } from "react";

export const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
export const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";
export const buttonClass =
  "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {textarea ? (
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={value}
          placeholder={placeholder ?? ""}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          placeholder={placeholder ?? ""}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <span className="mt-2 block text-sm text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel space-y-5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
