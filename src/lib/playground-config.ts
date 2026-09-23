import { useSyncExternalStore } from "react";
import { SolanaClient, type SolanaClientOptions } from "@solanaxph-sdk";

/** Browser-only playground configuration, persisted to localStorage. Test values only. */
export interface PlaygroundConfig {
  network: "devnet" | "mainnet";
  rpcUrl: string;
  rpcName: string;
  headers: string;
  commitment: "processed" | "confirmed" | "finalized";
  heliusApiKey: string;
  testSecretKey: string;
}

export const DEFAULT_CONFIG: PlaygroundConfig = {
  network: "devnet",
  rpcUrl: "",
  rpcName: "",
  headers: "",
  commitment: "confirmed",
  heliusApiKey: "",
  testSecretKey: "",
};

const KEY = "solanaxph-playground:config";
const listeners = new Set<() => void>();
let cache: PlaygroundConfig | null = null;

function read(): PlaygroundConfig {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<PlaygroundConfig>) } : DEFAULT_CONFIG;
  } catch {
    cache = DEFAULT_CONFIG;
  }
  return cache;
}

export function saveConfig(next: Partial<PlaygroundConfig>): void {
  cache = { ...read(), ...next };
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function clearConfig(): void {
  window.localStorage.removeItem(KEY);
  cache = DEFAULT_CONFIG;
  listeners.forEach((l) => l());
}

export function usePlaygroundConfig(): PlaygroundConfig {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULT_CONFIG,
  );
}

export function parseHeaders(text: string): Record<string, string> | undefined {
  if (!text.trim()) return undefined;
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Headers must be a JSON object");
  return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
}

/** Resolves the RPC endpoint: custom URL > Helius key > public network default. */
export function resolveOptions(c: PlaygroundConfig): SolanaClientOptions {
  let url = c.rpcUrl.trim() || undefined;
  let name = c.rpcName.trim() || undefined;
  if (!url && c.heliusApiKey.trim()) {
    const host = c.network === "mainnet" ? "mainnet.helius-rpc.com" : "devnet.helius-rpc.com";
    url = `https://${host}/?api-key=${encodeURIComponent(c.heliusApiKey.trim())}`;
    name = name ?? "helius";
  }
  let headers: Record<string, string> | undefined;
  try {
    headers = parseHeaders(c.headers);
  } catch {
    headers = undefined;
  }
  return {
    network: c.network,
    defaultCommitment: c.commitment,
    ...(url || headers ? { rpc: { ...(url ? { url } : {}), ...(name ? { name } : {}), ...(headers ? { headers } : {}) } } : {}),
  };
}

export function buildClient(c: PlaygroundConfig): SolanaClient {
  return new SolanaClient(resolveOptions(c));
}

/** Redacts secrets for display. */
export function redacted(c: PlaygroundConfig): Record<string, unknown> {
  const opts = resolveOptions(c);
  const mask = (s: string) => (s ? `${s.slice(0, 4)}…(${s.length} chars)` : "");
  return {
    ...opts,
    rpc: opts.rpc ? { ...opts.rpc, url: opts.rpc.url?.replace(/api-key=[^&]+/, "api-key=***") } : undefined,
    heliusApiKey: mask(c.heliusApiKey),
    testSecretKey: mask(c.testSecretKey),
  };
}
