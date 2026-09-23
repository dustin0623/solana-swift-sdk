/**
 * Blockchain-native discovery.
 *
 * A Solana RPC node can answer "does this mint exist and what is it?" but it
 * cannot rank tokens by volume, liquidity or trendiness, and it cannot search
 * by symbol or name — no such index exists on chain. This provider therefore
 * supports mint lookup only, and honestly reports everything else as
 * unsupported rather than faking it.
 */
import type { TokenReader, TokenMetadataOptions } from "../../reader/TokenReader.js";
import type { Address } from "../../types/index.js";
import { isValidAddress } from "../../utils/address.js";
import { UnsupportedOperationError } from "../../errors/index.js";
import {
  capabilities,
  type DiscoveredToken,
  type DiscoveryListQuery,
  type DiscoveryPage,
  type DiscoverySearchQuery,
  type DiscoverySource,
  type TokenDiscoveryProvider,
} from "../types.js";

export interface RpcTokenDiscoveryProviderOptions {
  name?: string;
  /** Also read Metaplex / Token-2022 metadata for name, symbol and logo. Default true. */
  metadata?: boolean;
  /** Passed through to `reader.tokens.metadata` (off-chain JSON stays opt-in). */
  metadataOptions?: TokenMetadataOptions;
}

export class RpcTokenDiscoveryProvider implements TokenDiscoveryProvider {
  public readonly name: string;
  public readonly capabilities = capabilities({
    search: true,
    searchByMint: true,
    metadata: true,
  });
  /** No sorting mode is derivable from plain RPC. */
  public readonly sorts = [] as const;

  private readonly withMetadata: boolean;
  private readonly metadataOptions: TokenMetadataOptions;

  constructor(
    private readonly reader: TokenReader,
    options: RpcTokenDiscoveryProviderOptions = {},
  ) {
    this.name = options.name ?? "rpc";
    this.withMetadata = options.metadata ?? true;
    this.metadataOptions = options.metadataOptions ?? {};
  }

  private get source(): DiscoverySource {
    return { provider: this.name, origin: "on-chain" };
  }

  /** Only a base58 mint address can be resolved here. */
  public async search(query: DiscoverySearchQuery): Promise<DiscoveryPage<DiscoveredToken>> {
    const term = query.query.trim();
    const allowed = query.match ?? ["mint"];
    if (!allowed.includes("mint") || !isValidAddress(term)) {
      return { items: [], nextCursor: null, hasMore: false, total: 0, source: this.source };
    }
    const token = await this.get(term);
    return {
      items: token ? [token] : [],
      nextCursor: null,
      hasMore: false,
      total: token ? 1 : 0,
      source: this.source,
    };
  }

  public list(_query: DiscoveryListQuery): Promise<DiscoveryPage<DiscoveredToken>> {
    return Promise.reject(
      new UnsupportedOperationError(
        `Discovery provider "${this.name}" cannot list tokens: a Solana RPC node has no token index. Register an indexed or market-data provider for listing.`,
      ),
    );
  }

  public async get(mint: Address): Promise<DiscoveredToken | null> {
    let decimals: number | null = null;
    let program: DiscoveredToken["program"] = null;
    try {
      const info = await this.reader.mint(mint);
      decimals = info.decimals;
      program = info.program;
    } catch {
      return null;
    }

    let name: string | null = null;
    let symbol: string | null = null;
    let logoUri: string | null = null;
    let raw: unknown = { mint, decimals, program };

    if (this.withMetadata) {
      try {
        const metadata = await this.reader.metadata(mint, this.metadataOptions);
        name = metadata.onChain?.name?.trim() || null;
        symbol = metadata.onChain?.symbol?.trim() || null;
        logoUri = metadata.offChain.status === "ok" ? (metadata.offChain.image ?? null) : null;
        raw = metadata;
      } catch {
        // Metadata is optional: a mint with none is still a discoverable token.
      }
    }

    return {
      mint,
      name,
      symbol,
      decimals,
      logoUri,
      program,
      createdAt: null,
      verification: "unknown",
      market: null,
      source: this.source,
      raw,
    };
  }
}
