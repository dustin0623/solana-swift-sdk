/**
 * Token discovery domain models.
 *
 * Discovery answers "which tokens should I show?" — a different concern from
 * token data ("tell me about this mint", handled by `reader.tokens`).
 *
 * Discovery is provider-driven: an RPC node cannot rank tokens by volume, and
 * a market-data API is not authoritative about mint state. Every result
 * therefore carries explicit provenance, and every provider declares what it
 * can actually do instead of the SDK pretending all features exist.
 */
import type { Address } from "../types/index.js";
import type { TokenProgram } from "./../types/token.js";

/** Sorting / listing modes a discovery provider may support. */
export type DiscoverySort = "new" | "trending" | "volume" | "liquidity" | "recent";

/** Individual capabilities a provider can advertise. */
export type DiscoveryCapability =
  | "search"
  | "searchByMint"
  | "searchBySymbol"
  | "searchByName"
  | "newTokens"
  | "trending"
  | "volume"
  | "liquidity"
  | "price"
  | "metadata"
  | "pagination";

export type DiscoveryCapabilities = Readonly<Record<DiscoveryCapability, boolean>>;

/** Where a value came from. On-chain data is verifiable; indexed data is not. */
export type DiscoveryDataOrigin = "on-chain" | "indexed";

/** Provenance attached to every discovery result. */
export interface DiscoverySource {
  /** Provider name, e.g. "rpc", "static-list", "my-indexer". */
  provider: string;
  /** "on-chain" only when the provider read the value from chain state itself. */
  origin: DiscoveryDataOrigin;
  /** Optional upstream attribution (an API name, dataset, URL). */
  attribution?: string;
}

/**
 * Market figures. These are ALWAYS indexed/third-party data: the SDK never
 * derives them from chain state and never treats them as authoritative.
 */
export interface DiscoveryMarketData {
  /** Quote currency for price / marketCap / volume / liquidity, e.g. "USD". */
  currency: string;
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  marketCap?: number;
  /** When the provider computed these figures (ISO 8601). */
  asOf?: string;
}

/** A token as returned by discovery, normalized across providers. */
export interface DiscoveredToken {
  mint: Address;
  name: string | null;
  symbol: string | null;
  /** Null when the provider does not know it (never guessed). */
  decimals: number | null;
  logoUri: string | null;
  program: TokenProgram | null;
  /** Creation time if the provider tracks it (ISO 8601). Indexed data. */
  createdAt: string | null;
  /**
   * Provider-declared verification status. "unknown" when the provider has no
   * opinion — it is never a statement that a token is safe.
   */
  verification: "verified" | "unverified" | "unknown";
  /** Indexed market figures, or null when the provider supplies none. */
  market: DiscoveryMarketData | null;
  source: DiscoverySource;
  /** Untouched provider payload for this entry. */
  raw: unknown;
}

/** Cursor pagination. Cursors are opaque provider-specific strings. */
export interface DiscoveryPageRequest {
  /** Max results. Providers may return fewer. Default 20. */
  limit?: number;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string | null;
}

export interface DiscoveryPage<T> {
  items: T[];
  /** Pass to the next call as `cursor`. Null when there is no further page. */
  nextCursor: string | null;
  /** True when `nextCursor` can be used. */
  hasMore: boolean;
  /** Total matches, only when the provider reports one. */
  total?: number;
  source: DiscoverySource;
}

export interface DiscoverySearchQuery extends DiscoveryPageRequest {
  /** Free text: symbol, name, or a base58 mint address. */
  query: string;
  /** Restrict matching. Default: whatever the provider supports. */
  match?: ReadonlyArray<"mint" | "symbol" | "name">;
}

export interface DiscoveryListQuery extends DiscoveryPageRequest {
  /** Listing mode. Must be supported by the active provider. */
  sort?: DiscoverySort;
}

/**
 * A token discovery provider. Implementations may be blockchain-native,
 * indexer-backed, market-data-backed, or entirely application-defined.
 *
 * Implementations must not leak provider-specific types through these
 * signatures — normalize into `DiscoveredToken` instead.
 */
export interface TokenDiscoveryProvider {
  /** Stable provider label used in results and errors. */
  readonly name: string;
  /** What this provider can actually do. */
  readonly capabilities: DiscoveryCapabilities;
  /** Sorting modes this provider supports. May be empty. */
  readonly sorts: readonly DiscoverySort[];

  search(query: DiscoverySearchQuery): Promise<DiscoveryPage<DiscoveredToken>>;
  list(query: DiscoveryListQuery): Promise<DiscoveryPage<DiscoveredToken>>;
  /** Single token lookup by mint. Null when the provider does not know it. */
  get(mint: Address): Promise<DiscoveredToken | null>;
}

export const NO_CAPABILITIES: DiscoveryCapabilities = Object.freeze({
  search: false,
  searchByMint: false,
  searchBySymbol: false,
  searchByName: false,
  newTokens: false,
  trending: false,
  volume: false,
  liquidity: false,
  price: false,
  metadata: false,
  pagination: false,
});

/** Builds a full capability record from the subset a provider supports. */
export function capabilities(
  enabled: Partial<Record<DiscoveryCapability, boolean>>,
): DiscoveryCapabilities {
  return Object.freeze({ ...NO_CAPABILITIES, ...enabled });
}
