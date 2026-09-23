/**
 * Swap quote domain models. Quotes only — nothing here signs, sends or
 * modifies accounts. All token amounts are bigint base units.
 */
import type { Address } from "../types/index.js";
import type { PoolDataOrigin, PoolType } from "../pools/types.js";

/** An exact ratio. `numerator / denominator`, both bigint, never floats. */
export interface Ratio {
  numerator: bigint;
  denominator: bigint;
}

/** Token spec accepted by quote(): a mint address or the "SOL" / "USDC" aliases. */
export type SwapTokenInput = Address | "SOL" | "USDC";

export interface SwapQuoteParams {
  input: SwapTokenInput;
  output: SwapTokenInput;
  /** Exact input amount in base units (lamports for SOL). Must be > 0. */
  amount: bigint;
  /** Slippage tolerance in basis points (100 = 1%). Default 50. */
  slippageBps?: number;
  /** Restrict to one registered quote provider. */
  provider?: string;
}

/** One leg of a route. Phase 4 routes are always a single hop. */
export interface SwapRouteHop {
  pool: Address;
  dex: string;
  poolType: PoolType;
  inputMint: Address;
  outputMint: Address;
  amountIn: bigint;
  amountOut: bigint;
  feeBps: number;
  feeAmount: bigint;
  /** Provenance of the reserves used for this hop. */
  reserveOrigin: PoolDataOrigin;
}

export interface SwapFee {
  /** Fee charged, in input-token base units. */
  amount: bigint;
  mint: Address;
  bps: number;
  pool: Address;
}

export interface SwapQuote {
  inputMint: Address;
  outputMint: Address;
  /** Exact input, base units. */
  inAmount: bigint;
  /** Expected output assuming no state change before execution. */
  outAmount: bigint;
  /** outAmount reduced by slippageBps, rounded down. */
  minOutAmount: bigint;
  slippageBps: number;
  /** Pool spot price: output base units per input base unit, before the trade. */
  spotPrice: Ratio;
  /** Quoted execution price: outAmount / inAmount (base units). */
  executionPrice: Ratio;
  /**
   * Price impact from moving the curve, in bps, excluding fees and
   * independent of slippage tolerance. Null when not reliably computable.
   */
  priceImpactBps: number | null;
  fees: SwapFee[];
  route: SwapRouteHop[];
  /** Pool addresses used, in route order. */
  pools: Address[];
  provider: string;
  /** Unix ms. */
  quotedAt: number;
  /** Unix ms after which the quote must be refreshed. */
  expiresAt: number;
}

/** Normalized request handed to providers (aliases already resolved). */
export interface ResolvedQuoteRequest {
  inputMint: Address;
  outputMint: Address;
  amount: bigint;
  slippageBps: number;
}

/**
 * A quote provider. Must return the normalized SwapQuote, never a
 * provider-specific format. Return null when no route is known.
 */
export interface SwapQuoteProvider {
  readonly name: string;
  quote(request: ResolvedQuoteRequest): Promise<SwapQuote | null>;
}
