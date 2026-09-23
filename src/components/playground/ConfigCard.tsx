import { useEffect, useState } from "react";
import { KeypairSigner } from "@solanaxph-sdk";
import {
  DEFAULT_CONFIG,
  buildClient,
  clearConfig,
  parseHeaders,
  redacted,
  saveConfig,
  usePlaygroundConfig,
  type PlaygroundConfig,
} from "../../lib/playground-config";

const label = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const input = "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm";
const btn =
  "inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghost = "inline-flex items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary";

export function ConfigCard() {
  const saved = usePlaygroundConfig();
  const [draft, setDraft] = useState<PlaygroundConfig>(saved);
  const [msg, setMsg] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);
  useEffect(() => setDraft(saved), [saved]);

  const set = <K extends keyof PlaygroundConfig>(k: K, v: PlaygroundConfig[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    try {
      parseHeaders(draft.headers);
      if (draft.testSecretKey.trim()) new KeypairSigner(draft.testSecretKey.trim());
      saveConfig(draft);
      setMsg("Saved to this browser. All playgrounds now use this configuration.");
    } catch (e) {
      setMsg(`Not saved: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  let signerAddress = "";
  try {
    if (saved.testSecretKey.trim()) signerAddress = new KeypairSigner(saved.testSecretKey.trim()).address;
  } catch {
    signerAddress = "invalid key";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
        <strong>Use throwaway values only.</strong> Everything here is stored in plain text in this browser's
        localStorage. Only enter test accounts, burner keypairs and disposable API keys — never a real wallet key or
        production API key. Nothing is ever signed or broadcast automatically.
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={label}>Network</span>
            <select className={input} value={draft.network} onChange={(e) => set("network", e.target.value === "mainnet" ? "mainnet" : "devnet")}>
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet (read-only)</option>
            </select>
          </label>
          <label className="block"><span className={label}>Default commitment</span>
            <select className={input} value={draft.commitment} onChange={(e) => set("commitment", e.target.value as PlaygroundConfig["commitment"])}>
              <option value="processed">processed</option>
              <option value="confirmed">confirmed</option>
              <option value="finalized">finalized</option>
            </select>
          </label>
          <label className="block"><span className={label}>Custom RPC URL (optional)</span>
            <input className={input} spellCheck={false} placeholder="https://api.devnet.solana.com" value={draft.rpcUrl} onChange={(e) => set("rpcUrl", e.target.value)} />
          </label>
          <label className="block"><span className={label}>Provider label (optional)</span>
            <input className={input} spellCheck={false} placeholder="my-node" value={draft.rpcName} onChange={(e) => set("rpcName", e.target.value)} />
          </label>
          <label className="block"><span className={label}>Helius API key (optional, test key)</span>
            <input className={input} type="password" spellCheck={false} value={draft.heliusApiKey} onChange={(e) => set("heliusApiKey", e.target.value)} />
            <span className="mt-1 block text-xs text-muted-foreground">Used only when no custom RPC URL is set.</span>
          </label>
          <label className="block"><span className={label}>Test secret key (base58, burner only)</span>
            <input className={input} type="password" spellCheck={false} value={draft.testSecretKey} onChange={(e) => set("testSecretKey", e.target.value)} />
          </label>
        </div>
        <label className="block"><span className={label}>Extra headers (JSON, optional)</span>
          <textarea className={`${input} h-20`} spellCheck={false} placeholder='{"x-api-key": "test"}' value={draft.headers} onChange={(e) => set("headers", e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={save}>Save configuration</button>
          <button className={ghost} onClick={() => setDraft({ ...draft, testSecretKey: KeypairSigner.generate().toString() && "" })} hidden />
          <button className={ghost} onClick={() => { clearConfig(); setDraft(DEFAULT_CONFIG); setMsg("Cleared from this browser."); }}>Clear saved</button>
          <button className={ghost} onClick={async () => {
            setTest("Testing…");
            try { setTest(`OK — slot ${String(await buildClient(saved).rpc.getSlot())}`); }
            catch (e) { setTest(`Failed: ${e instanceof Error ? e.message : String(e)}`); }
          }}>Test saved connection</button>
        </div>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        {test ? <p className="font-mono text-sm">{test}</p> : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold">Active configuration (secrets masked)</h2>
        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          {JSON.stringify({ ...redacted(saved), signerAddress: signerAddress || undefined }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
