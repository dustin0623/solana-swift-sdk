import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import { HiveClient } from "@package";
import type { HiveAccountConfig, IssuerOperationPreview } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";

export const Route = createFileRoute("/docs/playground/configurations")({
  head: () => ({
    meta: [
      { title: "Configuration Manager — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Create named Hive configurations, map account aliases to accounts or environment variables, and preview issuer operations without private keys.",
      },
      { property: "og:title", content: "Configuration Manager — HiveXPH SDK" },
      {
        property: "og:description",
        content:
          "Named configurations, account aliases and environment references for the Hive SDK.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfigsPage,
});

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";
const buttonClass =
  "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";
const ghostButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary";

interface AliasDraft {
  alias: string;
  /** Direct account name, or empty when using accountEnv. */
  account: string;
  /** Environment variable holding the account name. */
  accountEnv: string;
  /** Environment variable holding the signing key (backend only). */
  keyEnv: string;
}

function ConfigsPage() {
  const { hive, endpoint } = useHive();

  const [applicationId, setApplicationId] = useState("my-application");
  const [aliases, setAliases] = useState<AliasDraft[]>([
    { alias: "tokenIssuer", account: "tokenissuer", accountEnv: "", keyEnv: "" },
    { alias: "treasury", account: "", accountEnv: "HIVE_TREASURY_ACCOUNT", keyEnv: "HIVE_TREASURY_KEY" },
  ]);
  const [client, setClient] = useState<HiveClient>(() => hive);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);


  const [preview, setPreview] = useState<IssuerOperationPreview | null>(null);
  const [issueAlias, setIssueAlias] = useState("tokenIssuer");
  const [mintSymbol, setMintSymbol] = useState("TOKEN");
  const [mintAccount, setMintAccount] = useState("destination-account");
  const [mintQuantity, setMintQuantity] = useState("100");

  const declaredAliases = useMemo(() => client.listAccounts(), [client]);

  const run = (action: () => void) => {
    setError(null);
    try {
      action();
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  const declareConfig = () =>
    run(() => {
      const accounts: Record<string, HiveAccountConfig> = {};
      for (const entry of aliases) {
        if (!entry.alias.trim()) continue;
        if (!entry.account.trim() && !entry.accountEnv.trim()) continue;
        accounts[entry.alias.trim()] = {
          ...(entry.account.trim() ? { account: entry.account.trim() } : {}),
          ...(entry.accountEnv.trim() ? { accountEnv: entry.accountEnv.trim() } : {}),
          ...(entry.keyEnv.trim() ? { keyEnv: entry.keyEnv.trim() } : {}),
        };
      }
      setClient(
        new HiveClient({
          endpoint,
          accounts,
          ...(applicationId.trim() ? { applicationId: applicationId.trim() } : {}),
        }),
      );
    });

  const issue = async () => {
    setError(null);
    setPreview(null);
    try {
      const result = await client.issuer.token.buildIssue({
        from: client.account(issueAlias),
        symbol: mintSymbol,
        account: mintAccount,
        quantity: mintQuantity,
      });
      setPreview(result);
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.configs / hive.accounts"
        title="Configuration Manager"
        description="The SDK does not manage staging, production or testing. You define your own configuration structure and read it back verbatim from hive.configs. The reserved accounts key maps developer-defined aliases to real Hive accounts, directly or through environment variables — keys are resolved lazily on the backend and never stored, logged or displayed."
      />

      {error ? <ErrorPanel message={error.message} raw={error.raw} /> : null}

      <section className="panel space-y-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" /> Declare configuration
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>applicationId</span>
            <input
              className={inputClass}
              value={applicationId}
              spellCheck={false}
              onChange={(event) => setApplicationId(event.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3">
          <span className={labelClass}>Account aliases</span>
          {aliases.map((entry, index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
            >
              <label className="block">
                <span className={labelClass}>Alias</span>
                <input
                  className={inputClass}
                  value={entry.alias}
                  spellCheck={false}
                  onChange={(event) =>
                    setAliases((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, alias: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="block">
                <span className={labelClass}>Hive account</span>
                <input
                  className={inputClass}
                  value={entry.account}
                  spellCheck={false}
                  onChange={(event) =>
                    setAliases((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, account: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="block">
                <span className={labelClass}>accountEnv (optional)</span>
                <input
                  className={inputClass}
                  value={entry.accountEnv}
                  spellCheck={false}
                  placeholder="HIVE_TREASURY_ACCOUNT"
                  onChange={(event) =>
                    setAliases((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, accountEnv: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="block">
                <span className={labelClass}>keyEnv (backend only)</span>
                <input
                  className={inputClass}
                  value={entry.keyEnv}
                  spellCheck={false}
                  placeholder="HIVE_TREASURY_KEY"
                  onChange={(event) =>
                    setAliases((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, keyEnv: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className={ghostButtonClass}
                onClick={() => setAliases((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={ghostButtonClass}
            onClick={() =>
              setAliases((prev) => [
                ...prev,
                { alias: "", account: "", accountEnv: "", keyEnv: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Add alias
          </button>
        </div>

        <button type="button" className={buttonClass} onClick={declareConfig}>
          Build client with this configuration
        </button>
        <p className="text-xs text-muted-foreground">
          Configuration is declarative and immutable: this rebuilds a <code>HiveClient</code> with
          the declaration above. There is no runtime switching — one client, one configuration.
        </p>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">hive.configs</h2>
        <p className="text-sm text-muted-foreground">
          Exactly the object you passed to the client, frozen. SDK runtime options such as{" "}
          <code>endpoint</code> are not part of it.
        </p>
        <JsonBlock value={client.configs} />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Environment references</h2>
        <p className="text-sm text-muted-foreground">
          An alias declares either <code>account</code> or <code>accountEnv</code>, and optionally{" "}
          <code>key</code> or <code>keyEnv</code>. Nothing is read until an operation needs it: the
          injectable <code>EnvironmentResolver</code> is only consulted at resolution time, on the
          server. In this browser playground no private key exists or can be resolved — signing keys
          belong to backend processes only.
        </p>
        <JsonBlock
          value={{
            resolvedAliases: declaredAliases.map((alias) => {
              try {
                return client.resolveAccount(alias);
              } catch (caught) {
                return { alias, error: errorMessage(caught) };
              }
            }),
          }}
        />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Issuer payload preview</h2>
        <p className="text-sm text-muted-foreground">
          Builds the signed-transaction payload without any network call or signing. <code>from</code> is an account alias resolved through the configuration.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={labelClass}>from (alias)</span>
            <input
              className={inputClass}
              value={issueAlias}
              spellCheck={false}
              onChange={(event) => setIssueAlias(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>symbol</span>
            <input
              className={inputClass}
              value={mintSymbol}
              spellCheck={false}
              onChange={(event) => setMintSymbol(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>account (destination)</span>
            <input
              className={inputClass}
              value={mintAccount}
              spellCheck={false}
              onChange={(event) => setMintAccount(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>quantity (string)</span>
            <input
              className={inputClass}
              value={mintQuantity}
              spellCheck={false}
              onChange={(event) => setMintQuantity(event.target.value)}
            />
          </label>
        </div>
        <button type="button" className={buttonClass} onClick={issue}>
          Build token.issue() payload
        </button>
        {preview ? <JsonBlock value={preview} /> : null}
      </section>
    </div>
  );
}
