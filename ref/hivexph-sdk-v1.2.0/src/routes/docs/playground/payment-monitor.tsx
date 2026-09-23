import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Search, Square } from "lucide-react";
import type { ParsedPayment, PaymentValidationResult } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel, Field } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/payment-monitor")({
  head: () => ({
    meta: [
      { title: "Payment Monitor — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Validate a Hive or Hive Engine payment by transaction id, then watch live transfers with filters and execution checks.",
      },
      { property: "og:title", content: "Payment Monitor — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Validate payments and monitor live payment streams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentMonitorPage,
});

const MAX_EVENTS = 50;
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

function PaymentMonitorPage() {
  const { hive } = useHive();

  const [transactionId, setTransactionId] = useState("");
  const [expectedFrom, setExpectedFrom] = useState("");
  const [expectedAccount, setExpectedAccount] = useState("");
  const [expectedSymbol, setExpectedSymbol] = useState("");
  const [expectedQuantity, setExpectedQuantity] = useState("");
  const [expectedAction, setExpectedAction] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PaymentValidationResult | null>(null);
  const [validationError, setValidationError] = useState<{ message: string; raw: unknown } | null>(
    null,
  );

  const [streamQuantity, setStreamQuantity] = useState("");
  const [streamFrom, setStreamFrom] = useState("");
  const [streamAccount, setStreamAccount] = useState("");
  const [streamSymbol, setStreamSymbol] = useState("");
  const [streamAction, setStreamAction] = useState("");
  const [requireTrigger, setRequireTrigger] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [events, setEvents] = useState<ParsedPayment[]>([]);
  const [scanned, setScanned] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const validate = async () => {
    setValidating(true);
    setValidationResult(null);
    setValidationError(null);

    try {
      const expected = {
        ...(expectedFrom.trim() ? { from: expectedFrom.trim() } : {}),
        ...(expectedAccount.trim() ? { account: expectedAccount.trim() } : {}),
        ...(expectedSymbol.trim() ? { symbol: expectedSymbol.trim() } : {}),
        ...(expectedQuantity.trim() ? { quantity: expectedQuantity.trim() } : {}),
        ...(expectedAction.trim() ? { action: expectedAction.trim() } : {}),
      };

      const result = await hive.payments.validate({
        transactionId: transactionId.trim(),
        ...(Object.keys(expected).length > 0 ? { expected } : {}),
      });
      setValidationResult(result);
    } catch (caught) {
      setValidationError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setValidating(false);
    }
  };

  const stopStream = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStreaming(false);
  };

  const startStream = async () => {
    if (controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;

    setStreaming(true);
    setStreamError(null);
    setEvents([]);
    setScanned(null);

    const actions = streamAction
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    try {
      for await (const payment of hive.payments.watch({
        signal: controller.signal,
        filters: {
          ...(streamQuantity.trim() ? { quantity: streamQuantity.trim() } : {}),
          ...(streamFrom.trim() ? { from: streamFrom.trim() } : {}),
          ...(streamAccount.trim() ? { account: streamAccount.trim() } : {}),
          ...(streamSymbol.trim() ? { symbol: streamSymbol.trim() } : {}),
          ...(actions.length > 0 ? { actions } : {}),
          requireTrigger,
        },
        onError: (caught: unknown) => setStreamError(errorMessage(caught)),
      })) {
        if (controller.signal.aborted) break;
        setScanned(payment.blockNumber ?? null);
        setEvents((prev) => [payment, ...prev].slice(0, MAX_EVENTS));
      }
    } catch (caught) {
      if (!controller.signal.aborted) setStreamError(errorMessage(caught));
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setStreaming(false);
      }
    }
  };

  const statusClass = (status: string) => {
    switch (status) {
      case "success":
        return "border-success/40 text-success";
      case "failed":
      case "invalid":
      case "not_found":
        return "border-destructive/50 text-destructive";
      default:
        return "border-warning/40 text-warning";
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="hive.payments"
        title="Payment Monitor"
        description="Validate a past payment by transaction id, then start a live stream to watch new HIVE, HBD and Hive Engine transfers as they arrive."
      />

      <section className="space-y-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 text-primary" /> Validate a payment
        </h2>

        <div className="panel grid gap-4 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className={labelClass}>Transaction ID</span>
            <input
              className={inputClass}
              value={transactionId}
              placeholder="a1b2c3..."
              spellCheck={false}
              onChange={(event) => setTransactionId(event.target.value)}
            />
          </label>
          <button
            onClick={() => void validate()}
            disabled={validating || transactionId.trim() === ""}
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Search className="size-4" />
            {validating ? "Validating..." : "Validate"}
          </button>
        </div>

        <div className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className={labelClass}>Expected from</span>
            <input
              className={inputClass}
              value={expectedFrom}
              spellCheck={false}
              onChange={(event) => setExpectedFrom(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Expected account</span>
            <input
              className={inputClass}
              value={expectedAccount}
              spellCheck={false}
              onChange={(event) => setExpectedAccount(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Expected symbol</span>
            <input
              className={inputClass}
              value={expectedSymbol}
              spellCheck={false}
              onChange={(event) => setExpectedSymbol(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Expected quantity</span>
            <input
              className={inputClass}
              value={expectedQuantity}
              spellCheck={false}
              onChange={(event) => setExpectedQuantity(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Expected action</span>
            <input
              className={inputClass}
              value={expectedAction}
              spellCheck={false}
              onChange={(event) => setExpectedAction(event.target.value)}
            />
          </label>
        </div>

        {validationError && (
          <ErrorPanel message={validationError.message} raw={validationError.raw} />
        )}

        {validationResult && (
          <div className="panel space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(validationResult.status)}`}
              >
                {validationResult.status}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {validationResult.network}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="From" value={validationResult.transfer.from || "—"} />
              <Field label="Account" value={validationResult.transfer.account || "—"} />
              <Field label="Symbol" value={validationResult.transfer.symbol || "—"} />
              <Field label="Quantity" value={validationResult.transfer.quantity || "—"} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Transaction ID" value={validationResult.transactionId || "—"} />
              <Field label="Operation index" value={validationResult.operationIndex ?? "—"} />
            </div>
            <JsonBlock value={validationResult} />
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Play className="h-4 w-4 text-primary" /> Live payment stream
        </h2>

        <div className="panel grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className={labelClass}>Quantity (exact, optional)</span>
            <input
              className={inputClass}
              value={streamQuantity}
              spellCheck={false}
              placeholder="10.000"
              onChange={(event) => setStreamQuantity(event.target.value)}
              disabled={streaming}
            />
          </label>

          <label className="block">
            <span className={labelClass}>From</span>
            <input
              className={inputClass}
              value={streamFrom}
              spellCheck={false}
              onChange={(event) => setStreamFrom(event.target.value)}
              disabled={streaming}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Account</span>
            <input
              className={inputClass}
              value={streamAccount}
              spellCheck={false}
              onChange={(event) => setStreamAccount(event.target.value)}
              disabled={streaming}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Symbol</span>
            <input
              className={inputClass}
              value={streamSymbol}
              spellCheck={false}
              onChange={(event) => setStreamSymbol(event.target.value)}
              disabled={streaming}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Action</span>
            <input
              className={inputClass}
              value={streamAction}
              spellCheck={false}
              onChange={(event) => setStreamAction(event.target.value)}
              disabled={streaming}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border bg-background text-primary"
              checked={requireTrigger}
              onChange={(event) => setRequireTrigger(event.target.checked)}
              disabled={streaming}
            />
            Require trigger
          </label>
          <div className="flex gap-2">
            <button
              onClick={startStream}
              disabled={streaming}
              className="inline-flex h-[42px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="size-4" />
              Start
            </button>
            <button
              onClick={stopStream}
              disabled={!streaming}
              className="inline-flex h-[42px] items-center gap-2 rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <Square className="size-4" />
              Stop
            </button>
          </div>
        </div>

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

        {streamError && <ErrorPanel message={streamError} />}

        <section className="space-y-3">
          {events.length === 0 && (
            <div className="panel p-5 text-sm text-muted-foreground">
              {streaming
                ? "Waiting for matching payments..."
                : "Start the stream to watch live payments."}
            </div>
          )}

          {events.map((payment, index) => (
            <article
              key={`${payment.transactionId ?? "tx"}-${payment.operationIndex ?? index}`}
              className="panel p-4"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
                <span className="text-foreground">
                  Block #{(payment.blockNumber ?? 0).toLocaleString("en-US")}
                </span>
                <span className="text-muted-foreground">{payment.network}</span>
                <span className={`rounded-full border px-2 py-0.5 ${statusClass(payment.status)}`}>
                  {payment.status}
                </span>
                <span className="text-accent">{payment.trigger?.action ?? "no trigger"}</span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                tx: {payment.transactionId || "—"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="From" value={payment.transfer.from || "—"} />
                <Field label="Account" value={payment.transfer.account || "—"} />
                <Field label="Symbol" value={payment.transfer.symbol || "—"} />
                <Field label="Quantity" value={payment.transfer.quantity || "—"} />
              </div>
              <div className="mt-3">
                <JsonBlock value={payment} label="Payment" maxHeight="12rem" />
              </div>
            </article>
          ))}
        </section>
      </section>
    </div>
  );
}
