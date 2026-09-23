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

/* ── Phase 5: transaction construction ─────────────────────────────── */

/** Context handed to a provider to produce protocol swap instructions. */
export interface SwapInstructionContext {
  quote: SwapQuote;
  /** Wallet that owns the source tokens and signs the swap. */
  owner: Address;
  /** Token account the input is debited from (wSOL ATA when wrapping SOL). */
  sourceAccount: Address;
  /** Token account the output is credited to. */
  destinationAccount: Address;
  inputTokenProgram: Address;
  outputTokenProgram: Address;
  /** Must be encoded on-chain as the protocol's minimum-out constraint. */
  minOutAmount: bigint;
}

/**
 * A provider that can both quote and build swaps. Builders must encode
 * `minOutAmount` as an on-chain constraint; providers whose protocol cannot
 * must set `enforcesMinOut: false` and will be refused by sdk.swap.build().
 */
export interface SwapProvider extends SwapQuoteProvider {
  readonly enforcesMinOut: boolean;
  buildSwapInstructions(context: SwapInstructionContext): Promise<import("../builder/types.js").Instruction[]>;
}

export interface SwapBuildParams {
  quote: SwapQuote;
  /** Wallet that owns the input tokens and signs. */
  owner: Address;
  /** Output recipient. Defaults to owner; never changed silently. */
  recipient?: Address;
  /** Fee payer. Defaults to owner. */
  feePayer?: Address;
  recentBlockhash?: string;
  /** Pair with recentBlockhash so confirmation can detect expiry. */
  lastValidBlockHeight?: number;
  version?: import("../builder/types.js").TransactionVersion;
  /** Optional compute budget. */
  priorityFeeMicroLamports?: bigint;
  computeUnitLimit?: number;
  /** Wrap native SOL into a temporary wSOL account when input is SOL. Default true. */
  wrapSol?: boolean;
  /** Unwrap received wSOL back to SOL when output is SOL. Default true. */
  unwrapSol?: boolean;
  /** Skip the pre-build re-quote pool check. Default false. */
  skipPoolCheck?: boolean;
}

export interface SwapEstimatedFees {
  /** Base signature fee (5000 lamports × required signers). */
  networkFeeLamports: bigint;
  priorityFeeLamports: bigint;
  /** Rent for token accounts created by this transaction (partly refundable). */
  rentLamports: bigint;
  /** SOL moved into wSOL for the swap input. */
  wrappedSolLamports: bigint;
  /** Total SOL the fee payer / owner must hold. */
  totalSolRequired: bigint;
}

export interface SwapBuildResult {
  /** Unsigned transaction. Sign it with your wallet; the SDK never does. */
  transaction: import("../builder/types.js").BuiltTransaction;
  instructions: import("../builder/types.js").Instruction[];
  quote: SwapQuote;
  requiredSigners: Address[];
  /** Block height after which the blockhash expires; null when unknown. */
  lastValidBlockHeight: number | null;
  estimatedFees: SwapEstimatedFees;
  accounts: {
    source: Address;
    destination: Address;
    recipient: Address;
    /** Token accounts this transaction creates. */
    created: Address[];
  };
  /** Construction succeeding does not guarantee execution succeeds. */
  warnings: string[];
}

/* ── Phase 6: execution ────────────────────────────────────────────── */

export interface SwapSimulation {
  success: boolean;
  /** Raw Solana error, untouched. Null on success. */
  error: unknown;
  logs: string[];
  unitsConsumed: number | null;
  returnData: unknown;
  /** Classified failure, when the simulation failed. */
  failureReason: import("../errors/index.js").SwapFailureReason | null;
  raw: unknown;
}

export interface SwapExecuteOptions {
  /** Signers for every required signer not already signed. Explicit only. */
  signers: readonly import("../wallet/Signer.js").SolanaSigner[];
  /** Target commitment. Default "confirmed". */
  commitment?: import("../types/index.js").Commitment;
  /** Simulate before signing. Default true. */
  simulate?: boolean;
  /** Skip node preflight on send. Default false. */
  skipPreflight?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface SwapExecutionResult {
  signature: string;
  confirmationStatus: import("../types/index.js").Commitment | null;
  slot: number;
  err: null;
  simulation: SwapSimulation | null;
  quote: SwapQuote;
}
