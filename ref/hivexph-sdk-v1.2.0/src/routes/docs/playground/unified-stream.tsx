import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { StreamEngine, StreamEvent } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/unified-stream")({
  head: () => ({
    meta: [
      { title: "Unified Stream — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Register Custom JSON and payment filters on one block reader and watch normalized events arrive live.",
      },
      { property: "og:title", content: "Unified Stream — HiveXPH SDK" },
      {
        property: "og:description",
        content: "One connection, many filters — the live unified stream engine playground.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnifiedStreamPlayground,
});

const MAX_EVENTS = 60;

/** Comma-separated action list -> OR-matched actions array. */
const splitActions = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

function UnifiedStreamPlayground() {
  const { hive } = useHive();

  const [cjEnabled, setCjEnabled] = useState(true);
  const [cjId, setCjId] = useState("my-application");
  const [cjAction, setCjAction] = useState("");

  const [payEnabled, setPayEnabled] = useState(false);
  const [payAccount, setPayAccount] = useState("");
  const [paySymbol, setPaySymbol] = useState("");
  const [payAction, setPayAction] = useState("");
  

  const [startBlock, setStartBlock] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [scanned, setScanned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<StreamEngine | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
    };
  }, []);

  const stop = () => {
    engineRef.current?.stop();
    engineRef.current = null;
    setStreaming(false);
  };

  const start = () => {
    if (engineRef.current) return;
    if (payEnabled && (!payAccount.trim() || !paySymbol.trim())) {
      setError("Payment filter needs both a recipient and a symbol.");
      return;
    }

    const parsedStart = Number.parseInt(startBlock.trim(), 10);
    const engine = hive.reader.stream({
      onError: (caught: unknown) => setError(errorMessage(caught)),
      ...(Number.isFinite(parsedStart) && parsedStart > 0 ? { fromBlock: parsedStart } : {}),
    });

    const push = (event: StreamEvent) => {
      setScanned(event.blockNumber ?? null);
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    };

    if (cjEnabled) {
      engine.customJson({
        ...(cjId.trim() ? { id: cjId.trim() } : {}),
        ...(splitActions(cjAction).length > 0 ? { actions: splitActions(cjAction) } : {}),
        handler: push,
      });
    }

    if (payEnabled) {
      engine.payment({
        account: payAccount.trim(),
        symbol: paySymbol.trim(),
        ...(splitActions(payAction).length > 0 ? { actions: splitActions(payAction) } : {}),
        
        handler: push,
        onFailed: push,
      });
    }

    engineRef.current = engine;
    setStreaming(true);
    setError(null);
    setEvents([]);
    setScanned(null);

    engine.start().catch((caught: unknown) => {
      setError(errorMessage(caught));
      if (engineRef.current === engine) {
        engineRef.current = null;
        setStreaming(false);
      }
    });
  };

  const paymentIncomplete = payEnabled && (!payAccount.trim() || !paySymbol.trim());
  const noFilters = (!cjEnabled && !payEnabled) || paymentIncomplete;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.reader.stream()"
        title="Unified stream"
        description="One block reader, many filters. Enable Custom JSON and payment filters together — the engine parses each operation once, normalizes it, then dispatches it to every matching filter."
      />

      <section className="panel space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_auto] lg:items-end">
          <label className="block">
            <span className={labelClass}>Start block (optional)</span>
            <input
              className={inputClass}
              value={startBlock}
              placeholder="head"
              spellCheck={false}
              onChange={(event) => setStartBlock(event.target.value)}
              disabled={streaming}
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={start}
              disabled={streaming || noFilters}
              className="inline-flex h-[42px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="size-4" />
              Start
            </button>
            <button
              onClick={stop}
              disabled={!streaming}
              className="inline-flex h-[42px] items-center gap-2 rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <Square className="size-4" />
              Stop
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <fieldset className="space-y-3 rounded-md border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={cjEnabled}
                onChange={(event) => setCjEnabled(event.target.checked)}
                disabled={streaming}
              />
              Custom JSON filter
            </label>
            <label className="block">
              <span className={labelClass}>ID</span>
              <input
                className={inputClass}
                value={cjId}
                spellCheck={false}
                onChange={(event) => setCjId(event.target.value)}
                disabled={streaming || !cjEnabled}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Action (optional)</span>
              <input
                className={inputClass}
                value={cjAction}
                spellCheck={false}
                onChange={(event) => setCjAction(event.target.value)}
                disabled={streaming || !cjEnabled}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-md border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={payEnabled}
                onChange={(event) => setPayEnabled(event.target.checked)}
                disabled={streaming}
              />
              Payment filter
            </label>
            <label className="block">
              <span className={labelClass}>Recipient (required)</span>
              <input
                className={inputClass}
                value={payAccount}
                spellCheck={false}
                onChange={(event) => setPayAccount(event.target.value)}
                disabled={streaming || !payEnabled}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Symbol (required)</span>
              <input
                className={inputClass}
                value={paySymbol}
                spellCheck={false}
                placeholder="HIVE, HBD or token"
                onChange={(event) => setPaySymbol(event.target.value)}
                disabled={streaming || !payEnabled}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Action (optional)</span>
              <input
                className={inputClass}
                value={payAction}
                spellCheck={false}
                onChange={(event) => setPayAction(event.target.value)}
                disabled={streaming || !payEnabled}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Payments without a valid trigger still stream in — they are tagged
              <span className="font-mono"> no trigger</span> and left unprocessed.
            </p>
          </fieldset>

        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${streaming ? "animate-pulse bg-success" : "bg-muted-foreground"}`}
          />
          {streaming ? "Streaming..." : "Idle"}
        </span>
        <span>last block: {scanned ? scanned.toLocaleString("en-US") : "—"}</span>
        <span>events: {events.length}</span>
        <span>buffer limit: {MAX_EVENTS}</span>
      </div>

      {error && <ErrorPanel message={error} />}

      <section className="space-y-3">
        {events.length === 0 && (
          <div className="panel p-5 text-sm text-muted-foreground">
            {streaming
              ? "Waiting for matching operations..."
              : noFilters
                ? "Enable at least one filter to start."
                : "Start the stream to watch live events."}
          </div>
        )}

        {events.map((event, index) => (
          <article
            key={`${event.transactionId}-${event.operationIndex}-${index}`}
            className="panel p-4"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
              <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">
                {event.type}
              </span>
              <span className="text-foreground">
                Block #{event.blockNumber?.toLocaleString("en-US") ?? "—"}
              </span>
              <span className="text-muted-foreground">op: {event.operationIndex ?? "—"}</span>
              <span className="break-all text-muted-foreground">
                tx: {event.transactionId || "—"}
              </span>
              {event.type === "payment" &&
                ("trigger" in event ? (
                  event.trigger?.action ? (
                    <span className="rounded-full border border-success/40 px-2 py-0.5 text-success">
                      action: {event.trigger.action}
                    </span>
                  ) : (
                    <span
                      className="rounded-full border border-border px-2 py-0.5 text-muted-foreground"
                      title="Memo is empty or not a valid standardized trigger — payment is shown but not processed."
                    >
                      no trigger · not processed
                    </span>
                  )
                ) : null)}
            </div>
            <div className="mt-3">
              <JsonBlock value={event} label="Event" maxHeight="14rem" />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
