/**
 * One Hive Engine token action per console: create, issue, transfer or burn.
 * Each action shows only the fields it needs, plus both signing paths —
 * a backend configuration alias and Hive Keychain.
 */
import { useState } from "react";
import { Coins, Wallet } from "lucide-react";
import { HiveClient } from "@package";
import type { IssuerOperationPreview, TokenCreationCheck } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";
import { Field, Panel, buttonClass } from "@/components/playground/form-ui";

export type TokenAction = "create" | "issue" | "transfer" | "burn";

const copy: Record<TokenAction, { title: string; description: string }> = {
  create: {
    title: "Create a token",
    description:
      "Create a new Hive Engine token. Token name, symbol, decimal precision and max supply are required; the website is optional and editable later in TribalDex Token Manager. Creation costs BEE, so the SDK checks the balance and symbol availability first.",
  },
  issue: {
    title: "Issue tokens",
    description:
      "Mint new units of a token you own to a destination account. Quantities are always decimal strings.",
  },
  transfer: {
    title: "Transfer tokens",
    description: "Move existing token balance from the signing account to another account.",
  },
  burn: {
    title: "Burn tokens",
    description:
      'Send tokens to the burn destination. Leave the destination empty and the SDK uses the Hive account "null".',
  },
};

export function TokenActionPanel({ action }: { action: TokenAction }) {
  const { hive, endpoint } = useHive();

  const [alias, setAlias] = useState("tokenIssuer");
  const [aliasAccount, setAliasAccount] = useState("issuer-account");
  const [username, setUsername] = useState("");
  const [symbol, setSymbol] = useState("TOKEN");
  const [account, setAccount] = useState("destination");
  const [quantity, setQuantity] = useState("100.000");
  const [memo, setMemo] = useState("");
  const [burnAccount, setBurnAccount] = useState("");

  const [tokenName, setTokenName] = useState("My Token");
  const [precision, setPrecision] = useState("3");
  const [maxSupply, setMaxSupply] = useState("1000000");
  const [url, setUrl] = useState("");
  const [check, setCheck] = useState<TokenCreationCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const [result, setResult] = useState<IssuerOperationPreview | null>(null);
  const [keychainResult, setKeychainResult] = useState<unknown>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);

  const run = async (fn: () => Promise<IssuerOperationPreview> | IssuerOperationPreview) => {
    setError(null);
    setResult(null);
    try {
      setResult(await fn());
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  const keychainRun = async (fn: () => Promise<unknown> | unknown) => {
    setError(null);
    setKeychainResult(null);
    try {
      setKeychainResult(await fn());
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  /** Alias → account mapping only; previews never touch a private key. */
  const context = () => {
    const aliasName = alias.trim();
    const accounts =
      aliasName && aliasAccount.trim() ? { [aliasName]: { account: aliasAccount.trim() } } : {};
    return new HiveClient({ endpoint, accounts });
  };
  const fromRef = () => context().account(alias.trim());

  const memoField = () => (memo.trim() ? { memo: memo.trim() } : {});
  const burnAccountField = () => (burnAccount.trim() ? { account: burnAccount.trim() } : {});

  const transferish = () => ({
    symbol: symbol.trim(),
    account: account.trim(),
    quantity: quantity.trim(),
    ...memoField(),
  });
  const burnish = () => ({
    symbol: symbol.trim(),
    quantity: quantity.trim(),
    ...burnAccountField(),
    ...memoField(),
  });
  const createish = () => ({
    symbol: symbol.trim(),
    name: tokenName.trim(),
    precision: Number(precision),
    maxSupply: maxSupply.trim(),
    ...(url.trim() ? { url: url.trim() } : {}),
  });

  const buildBackend = () =>
    run(async () => {
      const token = context().issuer.token;
      if (action === "issue") return token.buildIssue({ from: fromRef(), ...transferish() });
      if (action === "transfer") return token.buildTransfer({ from: fromRef(), ...transferish() });
      if (action === "burn") return token.buildBurn({ from: fromRef(), ...burnish() });
      return token.buildCreate({ from: fromRef(), ...createish() });
    });

  const buildKeychain = () =>
    keychainRun(() => {
      const token = hive.keychainIssuer.token;
      if (action === "issue") return token.buildIssue(transferish());
      if (action === "transfer") return token.buildTransfer(transferish());
      if (action === "burn") return token.buildBurn(burnish());
      return token.buildCreate(createish());
    });

  const broadcast = () =>
    keychainRun(() => {
      const token = hive.keychainIssuer.token;
      const username_ = username.trim();
      if (action === "issue") return token.issue({ username: username_, ...transferish() });
      if (action === "transfer") return token.transfer({ username: username_, ...transferish() });
      if (action === "burn") return token.burn({ username: username_, ...burnish() });
      return token.create({ username: username_, ...createish() });
    });

  const runCheck = async (server: boolean) => {
    setError(null);
    setCheck(null);
    setChecking(true);
    try {
      setCheck(
        server
          ? await context().issuer.token.checkCreate({ from: fromRef(), ...createish() })
          : await hive.keychainIssuer.token.checkCreate({
              username: username.trim(),
              symbol: symbol.trim(),
            }),
      );
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setChecking(false);
    }
  };

  const keychainAvailable = hive.keychain.isAvailable();
  const text = copy[action];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`hive.issuer.token.${action === "create" ? "create" : action}`}
        title={text.title}
        description={text.description}
      />

      {error ? <ErrorPanel message={error.message} raw={error.raw} /> : null}

      <Panel title="Action input" icon={<Coins className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Token symbol *" value={symbol} onChange={setSymbol} placeholder="TOKEN" />

          {action === "create" ? (
            <>
              <Field
                label="Token name *"
                value={tokenName}
                onChange={setTokenName}
                hint="Maximum of 50 characters."
              />
              <Field
                label="Decimal precision *"
                value={precision}
                onChange={setPrecision}
                hint="Must be between 0 and 8."
              />
              <Field
                label="Max supply *"
                value={maxSupply}
                onChange={setMaxSupply}
                hint="Must be between 1 and 9007199254740991."
              />
              <Field
                label="Website"
                value={url}
                onChange={setUrl}
                placeholder="https://"
                hint="Optional — editable later in TribalDex Token Manager."
              />
            </>
          ) : null}

          {action === "issue" || action === "transfer" ? (
            <Field label="To (account)" value={account} onChange={setAccount} />
          ) : null}

          {action !== "create" ? (
            <Field label="Quantity (string)" value={quantity} onChange={setQuantity} />
          ) : null}

          {action === "burn" ? (
            <Field
              label="Burn destination"
              value={burnAccount}
              onChange={setBurnAccount}
              placeholder="null"
              hint='Optional — defaults to the Hive account "null".'
            />
          ) : null}

          {action !== "create" ? <Field label="Memo (optional)" value={memo} onChange={setMemo} /> : null}
        </div>
      </Panel>

      <Panel title="Backend signing (configuration alias)" icon={<Coins className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From (account alias)" value={alias} onChange={setAlias} />
          <Field label="Alias → Hive account" value={aliasAccount} onChange={setAliasAccount} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={buildBackend}>
            Preview server payload
          </button>
          {action === "create" ? (
            <button
              type="button"
              className={buttonClass}
              disabled={checking || !alias.trim() || !symbol.trim()}
              onClick={() => runCheck(true)}
            >
              {checking ? "Checking…" : "Server BEE & symbol check"}
            </button>
          ) : null}
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
          <button type="button" className={buttonClass} onClick={buildKeychain}>
            Preview Keychain payload
          </button>
          {action === "create" ? (
            <button
              type="button"
              className={buttonClass}
              disabled={checking || !username.trim() || !symbol.trim()}
              onClick={() => runCheck(false)}
            >
              {checking ? "Checking…" : "Check BEE & symbol"}
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass}
            disabled={!keychainAvailable || !username.trim()}
            onClick={broadcast}
          >
            {action === "create" ? "Create with Keychain" : `Keychain ${action}`}
          </button>
        </div>
        {!keychainAvailable ? (
          <p className="text-xs text-muted-foreground">
            Hive Keychain was not detected in this browser. Previewing the payload still works.
          </p>
        ) : null}
      </Panel>

      {check ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            check.ok
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-destructive/40 bg-destructive/5 text-foreground"
          }`}
        >
          <p>
            Creation costs <span className="font-mono">{check.fee} BEE</span> and{" "}
            <span className="font-mono">{check.account}</span> holds{" "}
            <span className="font-mono">{check.balance} BEE</span>.
          </p>
          <p className="mt-1">
            Symbol <span className="font-mono">{check.symbol}</span>{" "}
            {check.symbolExists ? "already exists on Hive Engine." : "is available."}
          </p>
          {check.issues.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {check.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {keychainResult ? (
        <Panel title="Keychain output">
          <JsonBlock value={keychainResult} />
        </Panel>
      ) : null}

      {result ? (
        <Panel title="Action & custom_json operation">
          <JsonBlock value={result} />
        </Panel>
      ) : null}
    </div>
  );
}
