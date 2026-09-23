/**
 * Trading view models (Phase 7). These COMBINE existing layers — mint state,
 * metadata, discovery market data, pools and swap quotes — without mixing
 * their sources. Every display field records exactly where it came from.
 */
import type { Address } from "../types/index.js";
import type { Token, TokenMetadata } from "../types/token.js";
import type { DiscoveredToken, DiscoveryMarketData, DiscoverySource } from "../discovery/types.js";
import type { LiquidityPool, PoolValue } from "../pools/types.js";
import type { SwapQuote, SwapTokenInput } from "../swap/types.js";

/** Discovery categories. Each maps to a provider capability and is refused when unsupported. */
export type TradingDiscoveryCategory = "search" | "new" | "trending" | "recent" | "volume";

/**
 * Where a single display field came from.
 * - "mint": read from the mint account on chain (authoritative).
 * - "on-chain-metadata": Metaplex / Token-2022 metadata account.
 * - "off-chain-metadata": JSON at the metadata URI (unverifiable).
 * - "discovery": a discovery provider (indexed / third party).
 */
export type TradingFieldOrigin = "mint" | "on-chain-metadata" | "off-chain-metadata" | "discovery";

export interface TradingFieldSource {
  origin: TradingFieldOrigin;
  /** Provider / reader label, e.g. the RPC provider name or a discovery provider name. */
  provider: string;
}

export interface SourcedValue<T> {
  value: T;
  source: TradingFieldSource;
}

/** A pair the token can trade against, grouped from known pools. */
export interface TradingRoute {
  /** The other side of the pair. */
  pairedMint: Address;
  pairedSymbol: string | null;
  pools: Address[];
  dexes: string[];
}

/** Flattened per-pool row for display: pool, DEX, pair, liquidity, price, fee. */
export interface TradingPoolSummary {
  address: Address;
  dex: string;
  programId: Address | null;
  pair: string;
  pairedMint: Address;
  /** Best available liquidity figure, with provenance. Null when none. */
  liquidityUsd: (PoolValue & { kind: "indexed" | "tvl" | "estimated" }) | null;
  price: PoolValue | null;
  feeBps: number | null;
  hasReserves: boolean;
  /** Pool provider that reported this pool. */
  provider: string;
}

export interface TokenTradingView {
  mint: Address;
  name: SourcedValue<string> | null;
  symbol: SourcedValue<string> | null;
  decimals: SourcedValue<number>;
  image: SourcedValue<string> | null;
  description: SourcedValue<string> | null;
  /** Market figures are ALWAYS indexed/third-party. Null when no provider supplies any. */
  market: { data: DiscoveryMarketData; source: DiscoverySource } | null;

  /** Untouched layers, each with its own provenance. */
  layers: {
    token: { value: Token; source: TradingFieldSource };
    metadata: { value: TokenMetadata | null; error: string | null };
    discovery: { value: DiscoveredToken | null; error: string | null };
    pools: { value: LiquidityPool[]; provider: string | null; error: string | null };
  };
  pools: TradingPoolSummary[];
  routes: TradingRoute[];
  /** Non-fatal problems (a layer failed or is unavailable). */
  warnings: string[];
}

export interface TradingViewOptions {
  /** Fetch off-chain metadata JSON (image / description). Default false. */
  offChainMetadata?: boolean;
  /** Skip the discovery lookup. Default false. */
  skipDiscovery?: boolean;
  /** Skip pool lookup. Default false. */
  skipPools?: boolean;
  discoveryProvider?: string;
}

export interface BuyQuoteParams {
  mint: Address;
  /** What you pay with. Default "SOL". */
  spend?: SwapTokenInput;
  /** Exact input amount in base units of `spend`. */
  amount: bigint;
  slippageBps?: number;
  provider?: string;
}

export interface SellQuoteParams {
  mint: Address;
  /** What you receive. Default "SOL". "USDC" or any mint for token → token. */
  receive?: SwapTokenInput;
  /** Exact amount of `mint` to sell, in base units. */
  amount: bigint;
  slippageBps?: number;
  provider?: string;
}

/** Provider transparency for a quote or a built transaction. */
export interface TradeTrace {
  swapProvider: string;
  quote: Pick<SwapQuote, "inputMint" | "outputMint" | "inAmount" | "outAmount" | "minOutAmount" | "slippageBps" | "priceImpactBps">;
  hops: Array<{
    pool: Address;
    dex: string;
    /** Program the pool belongs to, per the pool provider. Null when unknown. */
    poolProgramId: Address | null;
    /** Pool provider that reported the pool. Null when not found. */
    poolProvider: string | null;
    reserveOrigin: string;
  }>;
  /**
   * Programs the built transaction actually invokes, in instruction order
   * (deduplicated). Null until the quote is built.
   */
  executingPrograms: Address[] | null;
  /** Programs invoked that are neither system/token/ATA/compute-budget — i.e. the DEX. */
  swapPrograms: Address[] | null;
}
