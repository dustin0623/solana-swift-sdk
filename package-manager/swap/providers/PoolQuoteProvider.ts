/**
 * Quotes direct single-pool routes from pools discovered via PoolClient,
 * using constant-product math. Only pools with known raw reserves and a
 * constant-product-compatible type are used; CLMM/stable/orderbook pools are
 * skipped because x*y=k would misquote them.
 */
import type { PoolClient } from "../../pools/PoolClient.js";
import type { LiquidityPool, PoolType } from "../../pools/types.js";
import { constantProductQuote, minimumReceived } from "../math.js";
import type { ResolvedQuoteRequest, SwapQuote, SwapQuoteProvider } from "../types.js";

const CP_TYPES: ReadonlySet<PoolType> = new Set(["amm", "cpmm"]);

export interface PoolQuoteProviderOptions {
  name?: string;
  /** Quote lifetime in ms. Default 30_000. */
  ttlMs?: number;
  /** Fee assumed when the pool reports none. Default: skip such pools. */
  defaultFeeBps?: number;
  now?: () => number;
}

export class PoolQuoteProvider implements SwapQuoteProvider {
  public readonly name: string;
  private readonly ttlMs: number;
  private readonly defaultFeeBps: number | undefined;
  private readonly now: () => number;

  constructor(private readonly pools: PoolClient, options: PoolQuoteProviderOptions = {}) {
    this.name = options.name ?? "pool-cpmm";
    this.ttlMs = options.ttlMs ?? 30_000;
    this.defaultFeeBps = options.defaultFeeBps;
    this.now = options.now ?? Date.now;
  }

  public async quote(req: ResolvedQuoteRequest): Promise<SwapQuote | null> {
    const page = await this.pools.find({ token: req.inputMint, pairedWith: req.outputMint });
    let best: SwapQuote | null = null;
    for (const pool of page.items) {
      const q = this.quotePool(pool, req);
      if (q && (!best || q.outAmount > best.outAmount)) best = q;
    }
    return best;
  }

  private quotePool(pool: LiquidityPool, req: ResolvedQuoteRequest): SwapQuote | null {
    if (!CP_TYPES.has(pool.poolType)) return null;
    const aIn = pool.tokenA.mint === req.inputMint && pool.tokenB.mint === req.outputMint;
    const bIn = pool.tokenB.mint === req.inputMint && pool.tokenA.mint === req.outputMint;
    if (!aIn && !bIn) return null;
    const sideIn = aIn ? pool.tokenA : pool.tokenB;
    const sideOut = aIn ? pool.tokenB : pool.tokenA;
    if (sideIn.reserveRaw === null || sideOut.reserveRaw === null) return null;
    if (sideIn.reserveRaw <= 0n || sideOut.reserveRaw <= 0n) return null;
    const feeBps = pool.fee.bps ?? this.defaultFeeBps;
    if (feeBps === undefined) return null;

    const r = constantProductQuote(req.amount, sideIn.reserveRaw, sideOut.reserveRaw, feeBps);
    if (r.amountOut <= 0n) return null;
    const quotedAt = this.now();
    return {
      inputMint: req.inputMint,
      outputMint: req.outputMint,
      inAmount: req.amount,
      outAmount: r.amountOut,
      minOutAmount: minimumReceived(r.amountOut, req.slippageBps),
      slippageBps: req.slippageBps,
      spotPrice: { numerator: sideOut.reserveRaw, denominator: sideIn.reserveRaw },
      executionPrice: { numerator: r.amountOut, denominator: req.amount },
      priceImpactBps: r.priceImpactBps,
      fees: [{ amount: r.feeAmount, mint: req.inputMint, bps: feeBps, pool: pool.address }],
      route: [
        {
          pool: pool.address,
          dex: pool.dex,
          poolType: pool.poolType,
          inputMint: req.inputMint,
          outputMint: req.outputMint,
          amountIn: req.amount,
          amountOut: r.amountOut,
          feeBps,
          feeAmount: r.feeAmount,
          reserveOrigin: sideIn.reserveOrigin ?? "indexed",
        },
      ],
      pools: [pool.address],
      provider: this.name,
      quotedAt,
      expiresAt: quotedAt + this.ttlMs,
    };
  }
}
