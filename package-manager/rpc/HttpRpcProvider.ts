import { RpcError, RpcHttpError } from "../errors/index";
import type { SolanaRpcProvider } from "./RpcProvider";

export interface HttpRpcProviderOptions {
  url: string;
  /** Provider label shown in errors. Defaults to the URL host. */
  name?: string;
  headers?: Readonly<Record<string, string>>;
  /** Request timeout in milliseconds. Default 30_000. */
  timeoutMs?: number;
  /**
   * Retries for *read* requests only. The RpcClient decides which methods are
   * safe to retry; broadcasting is never retried here.
   */
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/** Methods that are pure reads and therefore safe to retry on transport errors. */
const RETRY_SAFE = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlock",
  "getBlockHeight",
  "getBlockTime",
  "getEpochInfo",
  "getFeeForMessage",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTokenLargestAccounts",
  "getTokenSupply",
  "getTransaction",
  "getVersion",
]);

export class HttpRpcProvider implements SolanaRpcProvider {
  public readonly name: string;
  public readonly endpoint: string;

  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private nextId = 1;

  constructor(options: HttpRpcProviderOptions) {
    this.endpoint = options.url;
    this.name = options.name ?? safeHost(options.url);
    this.headers = { "content-type": "application/json", ...(options.headers ?? {}) };
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  public async request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
    const attempts = RETRY_SAFE.has(method) ? this.maxRetries + 1 : 1;
    let lastTransportError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.send<T>(method, params);
      } catch (error) {
        // Node-level errors are final: retrying cannot change the answer and
        // repeating a write could duplicate a side effect.
        if (error instanceof RpcError) throw error;
        lastTransportError = error;
        if (attempt < attempts - 1) {
          await delay(200 * 2 ** attempt);
        }
      }
    }
    throw lastTransportError;
  }

  private async send<T>(method: string, params: readonly unknown[]): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const id = this.nextId++;

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new RpcHttpError({
        endpoint: this.endpoint,
        message: error instanceof Error ? error.message : "request failed",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new RpcHttpError({
        endpoint: this.endpoint,
        status: response.status,
        message: `${response.status} ${response.statusText}`,
      });
    }

    let payload: JsonRpcResponse<T>;
    try {
      payload = (await response.json()) as JsonRpcResponse<T>;
    } catch {
      throw new RpcHttpError({ endpoint: this.endpoint, message: "response was not valid JSON" });
    }

    if (payload.error) {
      throw new RpcError({
        method,
        message: payload.error.message,
        rpcCode: payload.error.code,
        data: payload.error.data,
      });
    }
    return payload.result as T;
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "rpc";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
