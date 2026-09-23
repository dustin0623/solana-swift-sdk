import type { OffChainTokenMetadata } from "../../types/token.js";

export interface OffChainFetchOptions {
  /** Custom fetch (tests, proxies, server-side caching). Defaults to global fetch. */
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Maximum response size in bytes. Default 256 KiB. */
  maxBytes?: number;
  /** Gateway used for ipfs:// URIs. Default https://ipfs.io/ipfs/ */
  ipfsGateway?: string;
}

function resolveUri(uri: string, gateway: string): string | null {
  const trimmed = uri.trim();
  if (trimmed.startsWith("ipfs://")) return gateway + trimmed.slice("ipfs://".length).replace(/^ipfs\//, "");
  if (trimmed.startsWith("ar://")) return `https://arweave.net/${trimmed.slice("ar://".length)}`;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeString(value: unknown, max = 2000): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : undefined;
}

function safeUrl(value: unknown, gateway: string): string | undefined {
  const text = safeString(value);
  if (!text) return undefined;
  const resolved = resolveUri(text, gateway);
  return resolved && /^https?:/.test(resolved) ? resolved : undefined;
}

function empty(status: OffChainTokenMetadata["status"], uri: string | null, error?: string): OffChainTokenMetadata {
  return { status, uri, links: [], ...(error ? { error } : {}) };
}

/**
 * Fetches and validates off-chain JSON metadata. Never throws: failures are
 * reported through `status` and `error`. Values are untrusted — only
 * well-formed strings and http(s) URLs are kept.
 */
export async function fetchOffChainMetadata(
  uri: string,
  options: OffChainFetchOptions = {},
): Promise<OffChainTokenMetadata> {
  const gateway = options.ipfsGateway ?? "https://ipfs.io/ipfs/";
  if (!uri) return empty("unavailable", null, "No metadata URI");
  const url = resolveUri(uri, gateway);
  if (!url) return empty("invalid", uri, "Unsupported metadata URI scheme");

  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) return empty("unavailable", uri, "fetch is not available in this runtime");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) return empty("unavailable", uri, `HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > (options.maxBytes ?? 256 * 1024)) return empty("invalid", uri, "Metadata document too large");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return empty("invalid", uri, "Metadata is not valid JSON");
    }
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      return empty("invalid", uri, "Metadata JSON is not an object");
    }
    const doc = json as Record<string, unknown>;
    const links: Array<{ label: string; url: string }> = [];
    const extensions = doc["extensions"] ?? doc["links"];
    if (typeof extensions === "object" && extensions !== null && !Array.isArray(extensions)) {
      for (const [label, value] of Object.entries(extensions as Record<string, unknown>)) {
        const link = safeUrl(value, gateway);
        if (link) links.push({ label: label.slice(0, 50), url: link });
      }
    }
    const result: OffChainTokenMetadata = { status: "ok", uri, links, raw: json };
    const name = safeString(doc["name"], 200);
    const symbol = safeString(doc["symbol"], 50);
    const description = safeString(doc["description"]);
    const image = safeUrl(doc["image"], gateway);
    const externalUrl = safeUrl(doc["external_url"], gateway);
    if (name) result.name = name;
    if (symbol) result.symbol = symbol;
    if (description) result.description = description;
    if (image) result.image = image;
    if (externalUrl) result.externalUrl = externalUrl;
    return result;
  } catch (error) {
    return empty("unavailable", uri, error instanceof Error ? error.message : "Fetch failed");
  } finally {
    clearTimeout(timer);
  }
}
