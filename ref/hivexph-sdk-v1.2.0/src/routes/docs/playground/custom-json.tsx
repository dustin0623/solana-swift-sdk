import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { HiveAuthority, KeychainResult } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel, Field, SuccessPanel } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/custom-json")({
  head: () => ({
    meta: [
      { title: "Keychain Transaction — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Build and broadcast standardized Hive Custom JSON transactions through the Hive Keychain extension. No private keys are ever requested.",
      },
      { property: "og:title", content: "Keychain Transaction — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Broadcast standardized Custom JSON payloads through Hive Keychain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KeychainPage,
});

interface FormState {
  username: string;
  id: string;
  action: string;
  metadata: string;
  authority: HiveAuthority;
  message: string;
}

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

function KeychainPage() {
  const { hive } = useHive();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormState>({
    username: "",
    id: "my-application",
    action: "claim",
    metadata: '{\n  "rewardId": "123"\n}',
    authority: "posting",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<KeychainResult | null>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);
  const [request, setRequest] = useState<unknown>(null);

  useEffect(() => {
    const check = () => setAvailable(hive.keychain.isAvailable());
    check();
    const timer = setTimeout(check, 1200);
    return () => clearTimeout(timer);
  }, [hive]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const parseMetadata = (): Record<string, unknown> | null => {
    const raw = form.metadata.trim();
    if (raw === "") return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Metadata must be a JSON object or empty");
    }
    return parsed as Record<string, unknown>;
  };

  const submit = async () => {
    setSending(true);
    setResult(null);
    setError(null);
    setRequest(null);

    try {
      const metadata = parseMetadata();
      const operation = hive.builder.buildOperation({
        username: form.username,
        id: form.id,
        action: form.action,
        metadata,
        authority: form.authority,
      });
      setRequest(operation);

      const response = await hive.keychain.customJson({
        username: form.username,
        id: form.id,
        action: form.action,
        metadata,
        authority: form.authority,
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
      });
      setResult(response);
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.keychain.customJson()"
        title="Keychain Transaction"
        description="The SDK builds the standardized { action, metadata } payload, serializes it, and hands it to Hive Keychain for signing. Private keys never touch this application."
      />

      <div
        className={`panel flex flex-wrap items-center gap-3 p-4 ${available ? "border-success/40" : "border-destructive/50"}`}
      >
        <span
          className={`size-2 rounded-full ${available ? "bg-success" : "bg-destructive"}`}
          aria-hidden
        />
        <p className="text-sm text-foreground">
          {available === null
            ? "Detecting Hive Keychain..."
            : available
              ? "Hive Keychain detected"
              : "Hive Keychain is not installed — install the browser extension to broadcast."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Username</span>
              <input
                className={inputClass}
                value={form.username}
                placeholder="hiveuser"
                onChange={(event) => update("username", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Custom JSON ID</span>
              <input
                className={inputClass}
                value={form.id}
                placeholder="my-application"
                onChange={(event) => update("id", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Action</span>
              <input
                className={inputClass}
                value={form.action}
                placeholder="claim"
                onChange={(event) => update("action", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Authority</span>
              <select
                className={inputClass}
                value={form.authority}
                onChange={(event) => update("authority", event.target.value as HiveAuthority)}
              >
                <option value="posting">Posting</option>
                <option value="active">Active</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Metadata (JSON — leave empty for null)</span>
            <textarea
              className={`${inputClass} min-h-40 resize-y`}
              value={form.metadata}
              spellCheck={false}
              onChange={(event) => update("metadata", event.target.value)}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Display message</span>
            <input
              className={inputClass}
              value={form.message}
              placeholder="Claim reward"
              onChange={(event) => update("message", event.target.value)}
            />
          </label>

          <button
            onClick={() => void submit()}
            disabled={sending || !available}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="size-4" />
            {sending ? "Sending transaction..." : "Send Custom JSON Transaction"}
          </button>
        </section>

        <section className="space-y-4">
          {request != null && <JsonBlock value={request} label="Request (built operation)" />}

          {result && (
            <SuccessPanel title="Transaction submitted to Keychain">
              <Field label="Transaction ID" value={result.transactionId ?? "not returned"} />
              <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                Submitted ≠ processed. Confirm on-chain inclusion with the Transaction Reader or
                Block Stream.
              </p>
              <JsonBlock value={result.raw} label="Raw response" collapsible defaultOpen={false} />
            </SuccessPanel>
          )}

          {error && <ErrorPanel message={error.message} raw={error.raw} />}

          {!result && !error && !sending && (
            <div className="panel p-5 text-sm text-muted-foreground">
              Results appear here: the built operation, the normalized Keychain result, and the raw
              response.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
