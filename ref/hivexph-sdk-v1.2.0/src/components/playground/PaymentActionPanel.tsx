/**
 * One payment rail per console: native HIVE/HBD or a Hive Engine token
 * transfer, both carrying the standardized { action, metadata } trigger.
 */
import { useEffect, useState } from "react";
import { Coins, Wallet } from "lucide-react";
import { HiveClient } from "@package";
import type { HiveTransferPreview, IssuerOperationPreview, KeychainResult } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";
import { Field, Panel, buttonClass, inputClass, labelClass } from "@/components/playground/form-ui";

export type PaymentRail = "native" | "engine";

export function PaymentActionPanel({ rail }: { rail: PaymentRail }) {
  const { hive, endpoint } = useHive();

  const [alias, setAlias] = useState("treasury");
  const [aliasAccount, setAliasAccount] = useState("treasury-account");
  const [toAccount, setToAccount] = useState("bob");
  const [action, setAction] = useState("purchase");
  const [metadata, setMetadata] = useState('{\n  "orderId": "A-1029"\n}');
  const [message, setMessage] = useState("");

  const [nativeAmount, setNativeAmount] = useState("10.000");
  const [nativeSymbol, setNativeSymbol] = useState<"HIVE" | "HBD">("HIVE");
  const [engineSymbol, setEngineSymbol] = useState("SWAP.HIVE");
  const [engineQuantity, setEngineQuantity] = useState("10");

  const [username, setUsername] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);

  const [preview, setPreview] = useState<HiveTransferPreview | IssuerOperationPreview | null>(null);
  const [keychainResult, setKeychainResult] = useState<KeychainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);

  useEffect(() => {
    const check = () => setAvailable(hive.keychain.isAvailable());
    check();
    const timer = setTimeout(check, 1200);
    return () => clearTimeout(timer);
  }, [hive]);

  const parseMetadata = (): Record<string, unknown> | null => {
    const raw = metadata.trim();
    if (raw === "") return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Metadata must be a JSON object or empty");
    }
    return parsed as Record<string, unknown>;
  };

  const context = () => {
    const aliasName = alias.trim();
    const accounts =
      aliasName && aliasAccount.trim() ? { [aliasName]: { account: aliasAccount.trim() } } : {};
    return new HiveClient({ endpoint, accounts });
  };
  const fromRef = () => context().account(alias.trim());

  const reset = () => {
    setPreview(null);
    setKeychainResult(null);
    setError(null);
  };

  const build = () => {
    reset();
    setLoading(true);
    try {
      const parsed = parseMetadata();
      setPreview(
        rail === "native"
          ? context().payments.hive.build({
              from: fromRef(),
              account: toAccount.trim(),
              amount: nativeAmount.trim(),
              symbol: nativeSymbol,
              action: action.trim(),
              metadata: parsed,
            })
          : context().payments.engine.build({
              from: fromRef(),
              account: toAccount.trim(),
              symbol: engineSymbol.trim(),
              quantity: engineQuantity.trim(),
              action: action.trim(),
              metadata: parsed,
            }),
      );
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setLoading(false);
    }
  };

  const broadcast = async () => {
    reset();
    setLoading(true);
    try {
      const common = {
        username: username.trim(),
        account: toAccount.trim(),
        action: action.trim(),
        metadata: parseMetadata(),
        ...(message.trim() ? { message: message.trim() } : {}),
      };
      setKeychainResult(
        rail === "native"
          ? await hive.keychain.payments.hive.transfer({
              ...common,
              amount: nativeAmount.trim(),
              symbol: nativeSymbol,
            })
          : await hive.keychain.payments.engine.transfer({
              ...common,
              symbol: engineSymbol.trim(),
              quantity: engineQuantity.trim(),
            }),
      );
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={rail === "native" ? "hive.payments.hive" : "hive.payments.engine"}
        title={rail === "native" ? "Send a native payment" : "Send a Hive Engine payment"}
        description={
          rail === "native"
            ? "HIVE and HBD transfers that carry a standardized { action, metadata } trigger."
            : "Layer 2 token transfers that carry a standardized { action, metadata } trigger."
        }
      />

      {error ? <ErrorPanel message={error.message} raw={error.raw} /> : null}

      <Panel title="Payment input" icon={<Coins className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From (account alias)" value={alias} onChange={setAlias} />
          <Field label="Alias → Hive account" value={aliasAccount} onChange={setAliasAccount} />
          <Field label="To (account)" value={toAccount} onChange={setToAccount} />
          <Field label="Action" value={action} onChange={setAction} />
          {rail === "native" ? (
            <>
              <Field label="Amount (string)" value={nativeAmount} onChange={setNativeAmount} />
              <label className="block">
                <span className={labelClass}>Symbol</span>
                <select
                  className={inputClass}
                  value={nativeSymbol}
                  onChange={(event) => setNativeSymbol(event.target.value as "HIVE" | "HBD")}
                >
                  <option value="HIVE">HIVE</option>
                  <option value="HBD">HBD</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <Field label="Token symbol" value={engineSymbol} onChange={setEngineSymbol} />
              <Field label="Quantity (string)" value={engineQuantity} onChange={setEngineQuantity} />
            </>
          )}
          <Field label="Display message (Keychain only)" value={message} onChange={setMessage} />
        </div>

        <Field
          label="Metadata (JSON — leave empty for null)"
          value={metadata}
          onChange={setMetadata}
          textarea
        />

        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={build} disabled={loading}>
            Build transfer payload
          </button>
        </div>
      </Panel>

      <Panel title="Hive Keychain (browser account)" icon={<Wallet className="h-4 w-4 text-primary" />}>
        <div className="sm:max-w-sm">
          <Field
            label="Signing Hive account"
            value={username}
            onChange={setUsername}
            placeholder="your-hive-account"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={!available || !username.trim() || loading}
            onClick={broadcast}
          >
            Keychain transfer
          </button>
        </div>
        {!available ? (
          <p className="text-xs text-muted-foreground">
            Hive Keychain was not detected in this browser. Building the payload still works.
          </p>
        ) : null}
      </Panel>

      {preview ? (
        <Panel title="Transfer preview">
          <JsonBlock value={preview} />
        </Panel>
      ) : null}

      {keychainResult ? (
        <Panel title="Keychain result">
          <JsonBlock value={keychainResult} />
        </Panel>
      ) : null}
    </div>
  );
}
