import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "error" | "pending";

const toneStyles: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  success: "border-success/40 text-success",
  error: "border-destructive/50 text-destructive",
  pending: "border-warning/40 text-warning",
};

export function StatusCard({
  label,
  value,
  tone = "neutral",
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-3 truncate font-mono text-lg text-foreground" title={String(value)}>
        {value}
      </p>
      {hint && (
        <span
          className={`mt-3 inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] ${toneStyles[tone]}`}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
