import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Braces, Coins, Gem, KeyRound, LogIn, Wallet } from "lucide-react";
import type {
  HiveAuthority,
  HiveEngineContractAction,
  KeychainResult,
  KeychainSignInResult,
} from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel, Field, SuccessPanel } from "@/components/playground/ResultPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/docs/playground/keychain")({
  head: () => ({
    meta: [
      { title: "Hive Keychain Playground — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Exercise every Hive Keychain request the SDK exposes: extension detection, standardized and raw Custom JSON, native and Hive Engine transfers, token and NFT actions.",
      },
      { property: "og:title", content: "Hive Keychain Playground — HiveXPH SDK" },
      {
        property: "og:description",
        content: "All browser-signing interactions in one interactive page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KeychainPlaygroundPage,
});

const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-code-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring";
const buttonClass =
  "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50";

type KeychainActionResult = KeychainResult | KeychainSignInResult;

function parseJsonObject(raw: string, field: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed: unknown = JSON.parse(trimmed);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${field} must be a JSON object or empty`);
  }
  return parsed as Record<string, unknown>;
}

function KeychainPlaygroundPage() {
  const { hive } = useHive();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  // Sign in
  const [signInMessage, setSignInMessage] = useState("Sign in to my-application: nonce-123456");
  const [signInAuthority, setSignInAuthority] = useState<HiveAuthority>("posting");

  // Custom JSON
  const [cjId, setCjId] = useState("my-application");
  const [cjAction, setCjAction] = useState("claim_reward");
  const [cjMetadata, setCjMetadata] = useState('{\n  "questId": 42\n}');
  const [cjAuthority, setCjAuthority] = useState<HiveAuthority>("posting");
  const [rawId, setRawId] = useState("ssc-mainnet-hive");
  const [rawJson, setRawJson] = useState(
    '{\n  "contractName": "tokens",\n  "contractAction": "transfer",\n  "contractPayload": { "symbol": "SWAP.HIVE", "to": "bob", "quantity": "1" }\n}',
  );
  const [rawAuthority, setRawAuthority] = useState<HiveAuthority>("active");

  // Transfer
  const [tfTo, setTfTo] = useState("treasury");
  const [tfAmount, setTfAmount] = useState("1.000");
  const [tfCurrency, setTfCurrency] = useState("HIVE");
  const [tfMemo, setTfMemo] = useState(
    '{\n  "action": "buy_pack",\n  "metadata": { "packs": 1 }\n}',
  );
  const [tfEnforce, setTfEnforce] = useState(true);

  // Token issuer
  const [tkSymbol, setTkSymbol] = useState("MYTOKEN");
  const [tkAccount, setTkAccount] = useState("bob");
  const [tkQuantity, setTkQuantity] = useState("1");
  const [tkMemo, setTkMemo] = useState("");

  // NFT issuer
  const [nftSymbol, setNftSymbol] = useState("HERO");
  const [nftTo, setNftTo] = useState("bob");
  const [nftFeeSymbol, setNftFeeSymbol] = useState("BEE");
  const [nftProperties, setNftProperties] = useState('{\n  "level": 1\n}');
  const [nftIds, setNftIds] = useState("1, 2");

  const [preview, setPreview] = useState<{ label: string; value: unknown } | null>(null);
  const [result, setResult] = useState<KeychainActionResult | null>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);
  const [loading, setLoading] = useState(false);

  const check = () => setAvailable(hive.keychain.isAvailable());

  useEffect(() => {
    check();
    const timer = setTimeout(check, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hive]);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const showPreview = (label: string, build: () => unknown) => {
    reset();
    try {
      setPreview({ label, value: build() });
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  const run = async (fn: () => Promise<KeychainActionResult>) => {
    reset();
    setLoading(true);
    try {
      setResult(await fn());
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    } finally {
      setLoading(false);
    }
  };

  const user = username.trim();
  const canSign = Boolean(available) && user !== "" && !loading;
  const msg = message.trim() ? { message: message.trim() } : {};

  const nftIdList = () =>
    nftIds
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

  const tokenTransferInput = () => ({
    symbol: tkSymbol.trim(),
    account: tkAccount.trim(),
    quantity: tkQuantity.trim(),
    ...(tkMemo.trim() ? { memo: tkMemo.trim() } : {}),
  });

  const nftMintInput = () => {
    const properties = parseJsonObject(nftProperties, "Properties");
    return {
      symbol: nftSymbol.trim(),
      account: nftTo.trim(),
      feeSymbol: nftFeeSymbol.trim(),
      ...(properties ? { properties } : {}),
    };
  };

  const nftTransferInput = () => ({
    account: nftTo.trim(),
    nfts: [{ symbol: nftSymbol.trim(), ids: nftIdList() }],
  });

  const nftBurnInput = () => ({
    symbol: nftSymbol.trim(),
    id: nftIdList(),
  });

  const isNativeCurrency = ["HIVE", "HBD"].includes(tfCurrency.trim().toUpperCase());

  const keychainStatusPanel = (
    <section className="panel space-y-5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <KeyRound className="h-4 w-4 text-primary" /> Signing account
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Hive username (signs in Keychain)</span>
          <input
            className={inputClass}
            value={username}
            placeholder="your-hive-account"
            spellCheck={false}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Display message (optional)</span>
          <input
            className={inputClass}
            value={message}
            placeholder="Shown inside the Keychain popup"
            spellCheck={false}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            available
              ? "border-success/40 text-success"
              : "border-destructive/40 text-destructive"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {available === null
            ? "Checking…"
            : available
              ? "hive.keychain.isAvailable() → true"
              : "hive.keychain.isAvailable() → false"}
        </span>
        <button type="button" className={secondaryButtonClass} onClick={check}>
          Re-check extension
        </button>
      </div>
      {!available ? (
        <p className="text-xs text-muted-foreground">
          Hive Keychain was not detected. Install the browser extension to broadcast; the
          "Preview" buttons still work without it.
        </p>
      ) : null}
    </section>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="hive.keychain"
        title="Hive Keychain"
        description="Every browser-signing request the SDK exposes, in one place. No configuration, alias or private key is involved: the extension signs with the user's own keys."
      />

      {keychainStatusPanel}

      {error ? <ErrorPanel message={error.message} raw={error.raw} /> : null}

      <Tabs defaultValue="sign-in">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sign-in">Sign in</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="custom-json">Custom JSON</TabsTrigger>
          <TabsTrigger value="raw">Raw Custom JSON</TabsTrigger>
          <TabsTrigger value="token">Token</TabsTrigger>
          <TabsTrigger value="nft">NFT</TabsTrigger>
        </TabsList>

        {/* ── Sign in ───────────────────────────────────────────────── */}
        <TabsContent value="sign-in" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LogIn className="h-4 w-4 text-primary" /> hive.keychain.requestSignIn()
            </h2>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="block">
                <span className={labelClass}>Challenge message</span>
                <input
                  className={inputClass}
                  value={signInMessage}
                  spellCheck={false}
                  onChange={(event) => setSignInMessage(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Authority</span>
                <select
                  className={inputClass}
                  value={signInAuthority}
                  onChange={(event) => setSignInAuthority(event.target.value as HiveAuthority)}
                >
                  <option value="posting">posting</option>
                  <option value="active">active</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("requestSignIn input", () => ({
                    username: user || "<username>",
                    message: signInMessage.trim(),
                    authority: signInAuthority,
                  }))
                }
              >
                Preview
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign || signInMessage.trim() === ""}
                onClick={() =>
                  run(() =>
                    hive.keychain.requestSignIn({
                      username: user,
                      message: signInMessage.trim(),
                      authority: signInAuthority,
                    }),
                  )
                }
              >
                Sign in with Keychain
              </button>
            </div>
          </section>
        </TabsContent>

        {/* ── Transfer ─────────────────────────────────────────────── */}
        <TabsContent value="transfer" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-primary" /> hive.keychain.requestTransfer()
            </h2>
            <p className="text-sm text-muted-foreground">
              <code className="font-mono">HIVE</code> or <code className="font-mono">HBD</code> is
              a native Layer 1 transfer. Any other symbol (e.g.{" "}
              <code className="font-mono">SWAP.HIVE</code>) is a Hive Engine token — same call,
              routed to Keychain's token transfer.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>To (account)</span>
                <input
                  className={inputClass}
                  value={tfTo}
                  spellCheck={false}
                  onChange={(event) => setTfTo(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Amount (string)</span>
                <input
                  className={inputClass}
                  value={tfAmount}
                  spellCheck={false}
                  onChange={(event) => setTfAmount(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Currency / token symbol</span>
                <input
                  className={inputClass}
                  value={tfCurrency}
                  list="keychain-currency-suggestions"
                  spellCheck={false}
                  onChange={(event) => setTfCurrency(event.target.value)}
                />
                <datalist id="keychain-currency-suggestions">
                  <option value="HIVE" />
                  <option value="HBD" />
                  <option value="SWAP.HIVE" />
                </datalist>
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Memo (sent verbatim)</span>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={tfMemo}
                spellCheck={false}
                onChange={(event) => setTfMemo(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={tfEnforce}
                  disabled={!isNativeCurrency}
                  onChange={(event) => setTfEnforce(event.target.checked)}
                />
                enforce recipient {isNativeCurrency ? "" : "(native only)"}
              </label>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {isNativeCurrency ? "Layer 1 · native transfer" : "Layer 2 · Hive Engine token"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("requestTransfer input", () => ({
                    username: user || "<username>",
                    to: tfTo.trim(),
                    amount: tfAmount.trim(),
                    currency: tfCurrency.trim(),
                    memo: tfMemo,
                    ...(isNativeCurrency ? { enforce: tfEnforce } : {}),
                    routedTo: isNativeCurrency
                      ? "keychain.requestTransfer"
                      : "keychain.requestSendToken",
                  }))
                }
              >
                Preview
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychain.requestTransfer({
                      username: user,
                      to: tfTo.trim(),
                      amount: tfAmount.trim(),
                      currency: tfCurrency.trim(),
                      memo: tfMemo,
                      enforce: tfEnforce,
                    }),
                  )
                }
              >
                Sign with Keychain
              </button>
            </div>
          </section>
        </TabsContent>

        {/* ── Standard Custom JSON ─────────────────────────────────── */}
        <TabsContent value="custom-json" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Braces className="h-4 w-4 text-primary" /> hive.keychain.customJson()
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Custom JSON id</span>
                <input
                  className={inputClass}
                  value={cjId}
                  spellCheck={false}
                  onChange={(event) => setCjId(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Action</span>
                <input
                  className={inputClass}
                  value={cjAction}
                  spellCheck={false}
                  onChange={(event) => setCjAction(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Authority</span>
                <select
                  className={inputClass}
                  value={cjAuthority}
                  onChange={(event) => setCjAuthority(event.target.value as HiveAuthority)}
                >
                  <option value="posting">posting</option>
                  <option value="active">active</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Metadata (JSON — empty for null)</span>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={cjMetadata}
                spellCheck={false}
                onChange={(event) => setCjMetadata(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("Standardized custom_json body", () => ({
                    id: cjId.trim(),
                    authority: cjAuthority,
                    json: JSON.stringify({
                      action: cjAction.trim(),
                      metadata: parseJsonObject(cjMetadata, "Metadata"),
                    }),
                  }))
                }
              >
                Preview
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychain.customJson({
                      username: user,
                      id: cjId.trim(),
                      action: cjAction.trim(),
                      metadata: parseJsonObject(cjMetadata, "Metadata"),
                      authority: cjAuthority,
                      ...msg,
                    }),
                  )
                }
              >
                Sign with Keychain
              </button>
            </div>
          </section>
        </TabsContent>

        {/* ── Raw Custom JSON ──────────────────────────────────────── */}
        <TabsContent value="raw" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Braces className="h-4 w-4 text-primary" /> hive.keychain.customJsonRaw()
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Custom JSON id</span>
                <input
                  className={inputClass}
                  value={rawId}
                  spellCheck={false}
                  onChange={(event) => setRawId(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Authority</span>
                <select
                  className={inputClass}
                  value={rawAuthority}
                  onChange={(event) => setRawAuthority(event.target.value as HiveAuthority)}
                >
                  <option value="posting">posting</option>
                  <option value="active">active</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>JSON body (broadcast verbatim)</span>
              <textarea
                className={`${inputClass} min-h-40 resize-y`}
                value={rawJson}
                spellCheck={false}
                onChange={(event) => setRawJson(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("Raw custom_json body", () => ({
                    id: rawId.trim(),
                    authority: rawAuthority,
                    json: JSON.stringify(JSON.parse(rawJson)),
                  }))
                }
              >
                Preview
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychain.customJsonRaw({
                      username: user,
                      id: rawId.trim(),
                      json: JSON.stringify(JSON.parse(rawJson)),
                      authority: rawAuthority,
                      ...msg,
                    }),
                  )
                }
              >
                Sign with Keychain
              </button>
            </div>
          </section>
        </TabsContent>

        {/* ── Token issuer ─────────────────────────────────────────── */}
        <TabsContent value="token" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Coins className="h-4 w-4 text-primary" /> hive.keychainIssuer.token
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className={labelClass}>Symbol</span>
                <input
                  className={inputClass}
                  value={tkSymbol}
                  spellCheck={false}
                  onChange={(event) => setTkSymbol(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Account (issue / transfer target)</span>
                <input
                  className={inputClass}
                  value={tkAccount}
                  spellCheck={false}
                  onChange={(event) => setTkAccount(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Quantity (string)</span>
                <input
                  className={inputClass}
                  value={tkQuantity}
                  spellCheck={false}
                  onChange={(event) => setTkQuantity(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Memo (optional)</span>
                <input
                  className={inputClass}
                  value={tkMemo}
                  spellCheck={false}
                  onChange={(event) => setTkMemo(event.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildIssue", () =>
                    hive.keychainIssuer.token.buildIssue(tokenTransferInput()),
                  )
                }
              >
                Preview issue
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildTransfer", () =>
                    hive.keychainIssuer.token.buildTransfer(tokenTransferInput()),
                  )
                }
              >
                Preview transfer
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildBurn", () =>
                    hive.keychainIssuer.token.buildBurn({
                      symbol: tkSymbol.trim(),
                      quantity: tkQuantity.trim(),
                    }),
                  )
                }
              >
                Preview burn
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.token.issue({
                      username: user,
                      ...tokenTransferInput(),
                      ...msg,
                    }),
                  )
                }
              >
                Mint
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.token.transfer({
                      username: user,
                      ...tokenTransferInput(),
                      ...msg,
                    }),
                  )
                }
              >
                Transfer
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.token.burn({
                      username: user,
                      symbol: tkSymbol.trim(),
                      quantity: tkQuantity.trim(),
                      ...msg,
                    }),
                  )
                }
              >
                Burn
              </button>
            </div>
          </section>
        </TabsContent>

        {/* ── NFT issuer ───────────────────────────────────────────── */}
        <TabsContent value="nft" className="space-y-6">
          <section className="panel space-y-5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gem className="h-4 w-4 text-primary" /> hive.keychainIssuer.nft
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="block">
                <span className={labelClass}>NFT symbol</span>
                <input
                  className={inputClass}
                  value={nftSymbol}
                  spellCheck={false}
                  onChange={(event) => setNftSymbol(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Account (issue / transfer target)</span>
                <input
                  className={inputClass}
                  value={nftTo}
                  spellCheck={false}
                  onChange={(event) => setNftTo(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Fee symbol (issue)</span>
                <input
                  className={inputClass}
                  value={nftFeeSymbol}
                  spellCheck={false}
                  onChange={(event) => setNftFeeSymbol(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Instance ids (transfer / burn)</span>
                <input
                  className={inputClass}
                  value={nftIds}
                  placeholder="1, 2, 3"
                  spellCheck={false}
                  onChange={(event) => setNftIds(event.target.value)}
                />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Properties (issue — JSON, optional)</span>
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={nftProperties}
                spellCheck={false}
                onChange={(event) => setNftProperties(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildIssue", () =>
                    hive.keychainIssuer.nft.buildIssue(nftMintInput()),
                  )
                }
              >
                Preview issue
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildTransfer", () =>
                    hive.keychainIssuer.nft.buildTransfer(nftTransferInput()),
                  )
                }
              >
                Preview transfer
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  showPreview("buildBurn", () =>
                    hive.keychainIssuer.nft.buildBurn(nftBurnInput()),
                  )
                }
              >
                Preview burn
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.nft.issue({ username: user, ...nftMintInput(), ...msg }),
                  )
                }
              >
                Mint
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.nft.transfer({
                      username: user,
                      ...nftTransferInput(),
                      ...msg,
                    }),
                  )
                }
              >
                Transfer
              </button>
              <button
                type="button"
                className={buttonClass}
                disabled={!canSign}
                onClick={() =>
                  run(() =>
                    hive.keychainIssuer.nft.burn({ username: user, ...nftBurnInput(), ...msg }),
                  )
                }
              >
                Burn
              </button>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {preview ? (
        <section className="panel space-y-3 p-5">
          <h2 className="text-sm font-semibold text-foreground">Preview · {preview.label}</h2>
          <JsonBlock value={preview.value as HiveEngineContractAction | Record<string, unknown>} />
        </section>
      ) : null}

      {result ? (
        <SuccessPanel title="Keychain result">
          {"transactionId" in result ? (
            <Field label="Transaction id" value={result.transactionId ?? "— (not returned)"} />
          ) : (
            <>
              <Field label="Username" value={result.username} />
              <Field label="Signature" value={result.signature ?? "— (not returned)"} />
            </>
          )}
          <JsonBlock value={result.raw} label="Raw response" collapsible defaultOpen={false} />
        </SuccessPanel>
      ) : null}
    </div>
  );
}
