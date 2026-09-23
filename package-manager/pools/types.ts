/**
 * Pool and liquidity discovery domain models.
 *
 * Token discovery answers "which tokens exist?". Pool discovery answers
 * "where, if anywhere, can this token actually trade?". A token can exist
 * perfectly well with no pool at all, so these are separate layers.
 *
 * Pools live on many different protocols (constant-product AMMs, concentrated
 * liquidity, stable curves, custom programs) and no two expose the same
 * fields. Every field here is therefore optional-by-provenance: the model says
 * what is known, where it came from, and never invents the rest.
 */
import type { Address } from "../types/index.js";

/** Protocol families a pool can belong to. "unknown" is a valid answer. */
export type PoolType =
  | "amm"
  | "cpmm"
  | "clmm"
  | "stable"
  | "weighted"
  | "orderbook"
  | "custom"
  | "unknown";

/** Individual capabilities a pool provider can advertise. */
export type PoolCapability =
  | "findByToken"
  | "findByPair"
  | "getByAddress"
  | "reserves"
  | "liquidity"
  | "tvl"
  | "volume"
  | "price"
  | "fee"
  | "creation"
  | "pagination";

export type PoolCapabilities = Readonly<Record<PoolCapability, boolean>>;

/**
 * Where a value came from.
 * - "on-chain": the provider read it from chain state itself — verifiable.
 * - "indexed": supplied by a third party (indexer, market API) — not verifiable.
 * - "derived": computed by the SDK or provider from other values — an estimate.
 */
export type PoolDataOrigin = "on-chain" | "indexed" | "derived";

/** Provenance attached to every pool result. */
export interface PoolSource {
  /** Provider name, e.g. "static-pools", "my-indexer". */
  provider: string;
  /** Protocol label the pool belongs to, e.g. "raydium", "orca", "custom". */
  dex: string;
  origin: PoolDataOrigin;
  /** Optional upstream attribution (API name, dataset, URL). */
  attribution?: string;
  /** When the provider produced this snapshot (ISO 8601). */
  asOf?: string;
}

/** A numeric value that always carries its provenance. */
export interface PoolValue<T = number> {
  value: T;
  origin: PoolDataOrigin;
  /** Optional unit/quote hint, e.g. "USD", "tokenB per tokenA". */
  unit?: string;
}

/** One side of a pool. Reserves are only present when the provider has them. */
export interface PoolTokenSide {
  mint: Address;
  symbol: string | null;
  decimals: number | null;
  /** Raw reserve in base units, exactly as reported. Null when unknown. */
  reserveRaw: bigint | null;
  /** UI reserve, only computed when decimals are known. Null otherwise. */
  reserveUi: number | null;
  /** Provenance of the reserve figures. Null when there are none. */
  reserveOrigin: PoolDataOrigin | null;
}

/**
 * Liquidity is reported in four distinct, non-interchangeable forms. The SDK
 * never collapses them into a single "liquidity" number, and never presents an
 * estimate as an on-chain fact.
 */
export interface PoolLiquidity {
  /** True when both sides carry raw reserves read from chain state. */
  hasReserves: boolean;
  /** Provider-reported liquidity figure (third-party, unverifiable). */
  indexedUsd: PoolValue | null;
  /** Provider-reported total value locked (third-party, unverifiable). */
  tvlUsd: PoolValue | null;
  /** Estimate computed from reserves and a supplied price. Always "derived". */
  estimatedUsd: PoolValue | null;
}

/** Trading fee. `bps` is hundredths of a percent (30 = 0.30%). */
export interface PoolFee {
  bps: number | null;
  origin: PoolDataOrigin | null;
}

/** A liquidity pool / trading venue, normalized across protocols. */
export interface LiquidityPool {
  /** Pool account address. */
  address: Address;
  /** Protocol label, e.g. "raydium", "orca", "meteora", "custom". */
  dex: string;
  poolType: PoolType;
  /** Owning program, when the provider knows it. */
  programId: Address | null;
  tokenA: PoolTokenSide;
  tokenB: PoolTokenSide;
  /** Price of tokenA denominated in tokenB, when known. */
  price: PoolValue | null;
  liquidity: PoolLiquidity;
  /** 24h volume, always third-party data. */
  volume24hUsd: PoolValue | null;
  fee: PoolFee;
  /** Pool creation time (ISO 8601) when the provider tracks it. */
  createdAt: string | null;
  /** Creating transaction signature, when the provider tracks it. */
  createdSignature: string | null;
  source: PoolSource;
  /** Untouched provider payload for this pool. */
  raw: unknown;
}

/** Cursor pagination. Cursors are opaque provider-specific strings. */
export interface PoolPageRequest {
  limit?: number;
  cursor?: string | null;
}

export interface PoolPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
  source: Pick<PoolSource, "provider" | "dex">;
}

/** "Which pools trade this token?" Optionally constrained to a pair. */
export interface PoolQuery extends PoolPageRequest {
  /** The mint of interest. Matches pools where it is either side. */
  token: Address;
  /**
   * Restrict to pools pairing `token` with this mint — SOL, USDC or any
   * other SPL mint. Omit to return every known pair.
   */
  pairedWith?: Address;
  /** Restrict to a protocol label, e.g. "raydium". */
  dex?: string;
}

/**
 * A pool discovery provider. Implementations may read chain state directly,
 * wrap an indexer, or serve an application-defined pool set.
 *
 * Implementations must not leak protocol-specific types through these
 * signatures — normalize into `LiquidityPool` instead.
 */
export interface PoolProvider {
  /** Stable provider label used in results and errors. */
  readonly name: string;
  /** Protocol this provider covers ("multi" when it spans several). */
  readonly dex: string;
  readonly capabilities: PoolCapabilities;

  findPools(query: PoolQuery): Promise<PoolPage<LiquidityPool>>;
  /** Single pool lookup by address. Null when the provider does not know it. */
  getPool(address: Address): Promise<LiquidityPool | null>;
}

export const NO_POOL_CAPABILITIES: PoolCapabilities = Object.freeze({
  findByToken: false,
  findByPair: false,
  getByAddress: false,
  reserves: false,
  liquidity: false,
  tvl: false,
  volume: false,
  price: false,
  fee: false,
  creation: false,
  pagination: false,
});

/** Builds a full capability record from the subset a provider supports. */
export function poolCapabilities(
  enabled: Partial<Record<PoolCapability, boolean>>,
): PoolCapabilities {
  return Object.freeze({ ...NO_POOL_CAPABILITIES, ...enabled });
}
