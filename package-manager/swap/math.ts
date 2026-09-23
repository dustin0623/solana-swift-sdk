/** Exact integer swap math. No floating point for amounts. */
import { ValidationError } from "../errors/index.js";

export const BPS_DENOMINATOR = 10_000n;

export function assertBps(value: number, field: string, max = 10_000): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new ValidationError(`${field} must be an integer between 0 and ${max} bps`, field);
  }
}

/** Minimum received after slippage, rounded down. */
export function minimumReceived(outAmount: bigint, slippageBps: number): bigint {
  assertBps(slippageBps, "slippageBps");
  return (outAmount * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
}

export interface ConstantProductResult {
  amountOut: bigint;
  feeAmount: bigint;
  /** Output without fee, used to isolate price impact. */
  amountOutNoFee: bigint;
  /** Curve price impact in bps (fee excluded), rounded up. */
  priceImpactBps: number;
}

/** x*y=k exact-in quote. Fee is taken from the input. Output rounds down. */
export function constantProductQuote(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number,
): ConstantProductResult {
  if (amountIn <= 0n) throw new ValidationError("amount must be greater than zero", "amount");
  if (reserveIn <= 0n || reserveOut <= 0n) {
    throw new ValidationError("pool has no liquidity", "reserves");
  }
  assertBps(feeBps, "feeBps");
  const feeAmount = (amountIn * BigInt(feeBps) + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
  const inAfterFee = amountIn - feeAmount;
  const amountOut = (reserveOut * inAfterFee) / (reserveIn + inAfterFee);
  const amountOutNoFee = (reserveOut * amountIn) / (reserveIn + amountIn);
  // spot output = amountIn * reserveOut / reserveIn; impact = 1 - noFee/spot
  // = 1 - reserveIn / (reserveIn + amountIn) = amountIn / (reserveIn + amountIn)
  const denom = reserveIn + amountIn;
  const impact = (amountIn * BPS_DENOMINATOR + denom - 1n) / denom;
  return { amountOut, feeAmount, amountOutNoFee, priceImpactBps: Number(impact) };
}
