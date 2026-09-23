import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import type { HiveAuthority, KeychainResult } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel, Field, SuccessPanel } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/raw-custom-json")({
  head: () => ({
    meta: [
      { title: "Raw Custom JSON — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Broadcast a verbatim Custom JSON body through Hive Keychain for protocols like Hive Engine that define their own payload shape.",
      },
      { property: "og:title", content: "Raw Custom JSON — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Send an unmodified custom_json body through Hive Keychain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RawCustomJsonPage,
});

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";

const DEFAULT_JSON = `{
  "contractName": "tokens",
  "contractAction": "transfer",
  "contractPayload": {
    "symbol": "MYTOKEN",
    "to": "bob",
    "quantity": "1"
  }
}`;

function RawCustomJsonPage() {
  const { hive } = useHive();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [id, setId] = useState("ssc-mainnet-hive");
  const [json, setJson] = useState(DEFAULT_JSON);
  const [authority, setAuthority] = useState<HiveAuthority>("active");
  const [message, setMessage] = useState("");
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

  const submit = async () => {
    setSending(true);
    setResult(null);
    setError(null);
    setRequest(null);

    try {
      const body = json.trim();
      // Validate locally, but broadcast the string exactly as typed.
      JSON.parse(body);
      const payload = {
        username,
        id,
        json: body,
        authority,
        ...(message.trim() ? { message: message.trim() } : {}),
      };
      setRequest(payload);
      setResult(await hive.keychain.customJsonRaw(payload));
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.keychain.customJsonRaw()"
        title="Raw Custom JSON"
        description="Raw mode skips the standardized { action, metadata } envelope entirely. The body you type is the body that gets broadcast — required for protocols like Hive Engine."
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
                value={username}
                placeholder="hiveuser"
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Custom JSON ID</span>
              <input
                className={inputClass}
                value={id}
                placeholder="ssc-mainnet-hive"
                onChange={(event) => setId(event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Authority</span>
              <select
                className={inputClass}
                value={authority}
                onChange={(event) => setAuthority(event.target.value as HiveAuthority)}
              >
                <option value="active">Active</option>
                <option value="posting">Posting</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Display message</span>
              <input
                className={inputClass}
                value={message}
                placeholder="Transfer tokens"
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>Raw JSON body (broadcast verbatim)</span>
            <textarea
              className={`${inputClass} min-h-64 resize-y`}
              value={json}
              spellCheck={false}
              onChange={(event) => setJson(event.target.value)}
            />
          </label>

          <button
            onClick={() => void submit()}
            disabled={sending || !available}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="size-4" />
            {sending ? "Sending transaction..." : "Broadcast Raw Custom JSON"}
          </button>
        </section>

        <section className="space-y-4">
          {request != null && <JsonBlock value={request} label="Request (raw payload)" />}

          {result && (
            <SuccessPanel title="Transaction submitted to Keychain">
              <Field label="Transaction ID" value={result.transactionId ?? "not returned"} />
              <JsonBlock value={result.raw} label="Raw response" collapsible defaultOpen={false} />
            </SuccessPanel>
          )}

          {error && <ErrorPanel message={error.message} raw={error.raw} />}

          {!result && !error && !sending && (
            <div className="panel p-5 text-sm text-muted-foreground">
              Results appear here: the exact payload sent to Keychain and its raw response.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
