import type { ReactNode } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

type Tone = "info" | "warning" | "security";

const TONE = {
  info: { icon: Info, label: "Note", className: "border-border bg-surface text-muted-foreground" },
  warning: {
    icon: AlertTriangle,
    label: "Important",
    className: "border-warning/30 bg-warning/5 text-muted-foreground",
  },
  security: {
    icon: ShieldAlert,
    label: "Security",
    className: "border-primary/30 bg-primary/5 text-muted-foreground",
  },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, label, className } = TONE[tone];
  return (
    <div className={`flex gap-3 rounded-md border px-3 py-2.5 text-sm ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">
          {title ?? label}
        </p>
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/** Side-by-side comparison of the two separate transaction APIs. */
export function BackendVsKeychain() {
  const rows: Array<[string, string, string]> = [
    ["Runs in", "Server runtime", "Browser"],
    ["Account input", "Account alias", "username"],
    ["Signing key", "Environment variable", "User wallet"],
    ["Signing", "Configured private key", "Keychain extension"],
    ["Approval", "None — automated", "User approves each request"],
    ["Broadcast", "hive.rpc", "Keychain extension"],
    ["Entry point", "hive.issuer", "hive.keychain"],
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface/60">
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" />
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-foreground">
              Backend
            </th>
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-foreground">
              Hive Keychain
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, backend, keychain]) => (
            <tr key={label} className="border-t border-border">
              <td className="px-3 py-2 text-[13px] text-muted-foreground">{label}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-foreground">{backend}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-foreground">{keychain}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border bg-surface/40 px-3 py-2 text-xs text-muted-foreground">
        These are two separate transaction APIs. Neither one wraps the other, and there is no
        execution-mode switch between them.
      </p>
    </div>
  );
}
