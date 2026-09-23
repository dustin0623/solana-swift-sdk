import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { JsonBlock } from "./JsonBlock";

export function ErrorPanel({ message, raw }: { message: string; raw?: unknown }) {
  return (
    <div className="panel border-destructive/50 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-4" />
        <p className="text-sm font-semibold">Error</p>
      </div>
      <p className="mt-2 font-mono text-sm text-foreground">{message}</p>
      {raw !== undefined && raw !== null && (
        <div className="mt-3">
          <JsonBlock value={raw} label="Raw error" collapsible defaultOpen={false} />
        </div>
      )}
    </div>
  );
}

export function SuccessPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="panel border-success/40 p-4">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="size-4" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
