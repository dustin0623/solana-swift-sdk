import { HttpRpcProvider } from "../../rpc/HttpRpcProvider.js";
import type { SolanaRpcProvider } from "../../rpc/RpcProvider.js";

export interface HeliusRpcProviderOptions {
  /** Your Helius RPC URL, e.g. https://mainnet.helius-rpc.com/?api-key=... */
  url: string;
  /** Optional custom label; defaults to "helius". */
  name?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Helius HTTP RPC provider.
 *
 * Helius is just another SolanaRpcProvider. This class adds nothing mandatory;
 * it exists so applications can opt in explicitly and so that Helius-specific
 * extensions (priority fee API, token metadata, NFT APIs) can be added without
 * polluting the core RPC layer.
 */
export class HeliusRpcProvider extends HttpRpcProvider implements SolanaRpcProvider {
  public readonly name: string;

  constructor(options: HeliusRpcProviderOptions) {
    super({
      url: options.url,
      name: options.name ?? "helius",
      headers: options.headers,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
    this.name = options.name ?? "helius";
  }

  /** Helius-enhanced `getAsset` RPC for token/NFT metadata. */
  public async getAsset(assetId: string): Promise<unknown> {
    return this.request("getAsset", [assetId]);
  }

  /** Helius-enhanced `getAssetsByOwner` RPC. */
  public async getAssetsByOwner(
    owner: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<unknown> {
    return this.request("getAssetsByOwner", [
      { ownerAddress: owner, page: options.page ?? 1, limit: options.limit ?? 100 },
    ]);
  }
}
