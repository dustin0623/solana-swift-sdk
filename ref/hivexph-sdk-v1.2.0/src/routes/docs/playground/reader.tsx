import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import type { TransactionResult } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel, Field } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/reader")({
  head: () => ({
    meta: [
      { title: "Transaction Reader — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Look up a Hive transaction by id and normalize every standardized Custom JSON operation it contains.",
      },
      { property: "og:title", content: "Transaction Reader — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Read Custom JSON operations from any Hive transaction id.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReaderPage,
});

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

function ReaderPage() {
  const { hive } = useHive();
  const [transactionId, setTransactionId] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);

  const read = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await hive.reader.transaction({
        transactionId,
        ...(idFilter.trim() ? { id: idFilter.trim() } : {}),
      });
      setResult(response);
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.reader.transaction()"
        title="Transaction Reader"
        description="Fetches the transaction once, then normalizes every operation it contains — Custom JSON, payments, NFT actions and unknown operations — in blockchain order."
      />

      <section className="panel grid gap-4 p-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block">
          <span className={labelClass}>Transaction ID</span>
          <input
            className={inputClass}
            value={transactionId}
            spellCheck={false}
            placeholder="a1b2c3..."
            onChange={(event) => setTransactionId(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Custom JSON ID filter (optional)</span>
          <input
            className={inputClass}
            value={idFilter}
            placeholder="my-application"
            onChange={(event) => setIdFilter(event.target.value)}
          />
        </label>
        <button
          onClick={() => void read()}
          disabled={loading || transactionId.trim() === ""}
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="size-4" />
          {loading ? "Reading..." : "Read Transaction"}
        </button>
      </section>

      {error && <ErrorPanel message={error.message} raw={error.raw} />}

      {result && (
        <div className="space-y-6">
          <section className="panel grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Transaction ID" value={result.transactionId} />
            <Field
              label="Block Number"
              value={result.blockNumber ? result.blockNumber.toLocaleString("en-US") : "—"}
            />
            <Field label="Block Timestamp" value={result.blockTimestamp || "—"} />
          </section>

          <section className="panel grid gap-4 p-5 sm:grid-cols-4">
            <Field label="Operations" value={String(result.operations.length)} />
            <Field label="Custom JSON" value={String(result.customJson.length)} />
            <Field label="Payments" value={String(result.payments.length)} />
            <Field label="NFT actions" value={String(result.nfts.length)} />
          </section>

          {result.payments.length > 0 && (
            <JsonBlock value={result.payments} label="Payments" maxHeight="20rem" />
          )}
          {result.nfts.length > 0 && (
            <JsonBlock value={result.nfts} label="NFT operations" maxHeight="20rem" />
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Custom JSON events{" "}
              <span className="font-mono text-muted-foreground">({result.customJson.length})</span>
            </h2>

            {result.customJson.length === 0 && (
              <div className="panel p-5 text-sm text-muted-foreground">
                No standardized Custom JSON operations found in this transaction.
              </div>
            )}

            {result.customJson.map((event) => (
              <article key={event.eventId} className="panel space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-4">
                  <Field label="Account" value={event.account ?? "—"} />
                  <Field label="Custom JSON ID" value={event.id} />
                  <Field
                    label="Action"
                    value={<span className="text-accent">{event.action}</span>}
                  />
                  <Field label="Event ID" value={event.eventId} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Required Auths"
                    value={event.requiredAuths.join(", ") || "[]"}
                  />
                  <Field
                    label="Required Posting Auths"
                    value={event.requiredPostingAuths.join(", ") || "[]"}
                  />
                </div>
                <JsonBlock value={event.metadata} label="Metadata" maxHeight="16rem" />
                <JsonBlock value={event.raw} label="Raw operation" collapsible defaultOpen={false} />
              </article>
            ))}

            {result.invalid.length > 0 && (
              <div className="panel border-warning/40 p-5">
                <p className="text-sm font-semibold text-warning">
                  {result.invalid.length} operation(s) matched but failed protocol validation
                </p>
                <div className="mt-3 space-y-3">
                  {result.invalid.map((item: { reason: string; raw: unknown }, index: number) => (
                    <div key={index}>
                      <p className="font-mono text-xs text-muted-foreground">{item.reason}</p>
                      <JsonBlock value={item.raw} collapsible defaultOpen={false} label="raw" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <JsonBlock value={result.raw} label="Raw transaction" collapsible defaultOpen={false} />
        </div>
      )}
    </div>
  );
}
