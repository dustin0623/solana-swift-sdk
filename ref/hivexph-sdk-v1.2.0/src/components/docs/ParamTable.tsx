export interface ParamRow {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export function ParamTable({ rows, caption }: { rows: ParamRow[]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        {caption && (
          <caption className="border-b border-border bg-surface px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="bg-surface/60">
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Parameter
            </th>
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Type
            </th>
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Required
            </th>
            <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-[13px] text-foreground">{row.name}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-accent">{row.type}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">
                {row.required ? "Yes" : "No"}
              </td>
              <td className="px-3 py-2 text-[13px] text-muted-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Return value block: signature line plus an example shape. */
export function ReturnValue({ signature, children }: { signature: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[13px] text-accent">{signature}</p>
      {children}
    </div>
  );
}
