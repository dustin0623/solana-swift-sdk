/**
 * Pool ranking — the foundation for "which of these pools looks best?".
 *
 * This is deliberately NOT routing: it does not split orders, chain hops,
 * quote swaps or execute anything. It scores already-discovered pools so an
 * application can pick a venue to inspect.
 *
 * Every score is an opinion derived from provider-reported figures. Where a
 * figure is missing, the pool is not penalised with an invented number — the
 * factor is simply skipped and the result reports lower confidence.
 */
import type { LiquidityPool, PoolDataOrigin } from "./types.js";

export interface PoolRankingWeights {
  /** Bigger liquidity ranks higher. */
  liquidity: number;
  /** Bigger 24h volume ranks higher. */
  volume: number;
  /** Lower fee ranks higher. */
  fee: number;
  /** Lower estimated price impact for `amountUsd` ranks higher. */
  priceImpact: number;
  /** Preferred providers/DEXes rank higher. */
  preference: number;
}

export const DEFAULT_POOL_RANKING_WEIGHTS: PoolRankingWeights = Object.freeze({
  liquidity: 0.45,
  volume: 0.2,
  fee: 0.15,
  priceImpact: 0.15,
  preference: 0.05,
});

export interface PoolRankingOptions {
  /** Override any subset of the default weights. */
  weights?: Partial<PoolRankingWeights>;
  /** Provider names or DEX labels to favour, most preferred first. */
  prefer?: readonly string[];
  /** Drop pools whose best-known liquidity figure is below this (USD). */
  minLiquidityUsd?: number;
  /** Drop pools with no liquidity information at all. Default false. */
  requireLiquidity?: boolean;
  /**
   * Trade size used for the price-impact factor, in USD. Impact is estimated
   * from liquidity only — it is an ordering heuristic, never a quote.
   */
  amountUsd?: number;
}

export interface PoolRankingFactor {
  name: keyof PoolRankingWeights;
  /** Normalized 0..1 contribution before weighting. */
  score: number;
  weight: number;
  /** Provenance of the underlying figure, null for preference. */
  origin: PoolDataOrigin | null;
  detail: string;
}

export interface RankedPool {
  pool: LiquidityPool;
  /** Weighted score in 0..1. Comparable only within one ranking call. */
  score: number;
  /** Share of the weight that was backed by real data, 0..1. */
  confidence: number;
  factors: PoolRankingFactor[];
}

/** Best available liquidity figure for a pool, with its provenance. */
export function poolLiquidityUsd(
  pool: LiquidityPool,
): { value: number; origin: PoolDataOrigin } | null {
  const candidate = pool.liquidity.indexedUsd ?? pool.liquidity.tvlUsd ?? pool.liquidity.estimatedUsd;
  if (!candidate || !Number.isFinite(candidate.value)) return null;
  return { value: candidate.value, origin: candidate.origin };
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

/**
 * Very rough constant-product impact proxy: impact grows with trade size
 * relative to pool liquidity. Used only to order pools against each other.
 */
function impactScore(amountUsd: number, liquidityUsd: number): number {
  if (liquidityUsd <= 0) return 0;
  const ratio = amountUsd / liquidityUsd;
  return 1 / (1 + ratio * 10);
}

/** Scores and sorts pools, best first. Never mutates the input array. */
export function rankPools(
  pools: readonly LiquidityPool[],
  options: PoolRankingOptions = {},
): RankedPool[] {
  const weights: PoolRankingWeights = { ...DEFAULT_POOL_RANKING_WEIGHTS, ...options.weights };
  const prefer = options.prefer ?? [];

  const eligible = pools.filter((pool) => {
    const liquidity = poolLiquidityUsd(pool);
    if (options.requireLiquidity && liquidity === null) return false;
    if (options.minLiquidityUsd !== undefined) {
      if (liquidity === null) return false;
      if (liquidity.value < options.minLiquidityUsd) return false;
    }
    return true;
  });

  const maxLiquidity = Math.max(0, ...eligible.map((p) => poolLiquidityUsd(p)?.value ?? 0));
  const maxVolume = Math.max(0, ...eligible.map((p) => p.volume24hUsd?.value ?? 0));

  const ranked = eligible.map((pool) => {
    const factors: PoolRankingFactor[] = [];
    const liquidity = poolLiquidityUsd(pool);

    if (liquidity) {
      factors.push({
        name: "liquidity",
        score: normalize(liquidity.value, maxLiquidity),
        weight: weights.liquidity,
        origin: liquidity.origin,
        detail: `${liquidity.value} USD (${liquidity.origin})`,
      });
    }

    if (pool.volume24hUsd && Number.isFinite(pool.volume24hUsd.value)) {
      factors.push({
        name: "volume",
        score: normalize(pool.volume24hUsd.value, maxVolume),
        weight: weights.volume,
        origin: pool.volume24hUsd.origin,
        detail: `${pool.volume24hUsd.value} USD 24h (${pool.volume24hUsd.origin})`,
      });
    }

    if (pool.fee.bps !== null && Number.isFinite(pool.fee.bps)) {
      // 0 bps -> 1, 100 bps (1%) -> 0.
      factors.push({
        name: "fee",
        score: Math.max(0, 1 - pool.fee.bps / 100),
        weight: weights.fee,
        origin: pool.fee.origin,
        detail: `${pool.fee.bps} bps`,
      });
    }

    if (options.amountUsd !== undefined && liquidity) {
      factors.push({
        name: "priceImpact",
        score: impactScore(options.amountUsd, liquidity.value),
        weight: weights.priceImpact,
        origin: "derived",
        detail: `estimated impact for ${options.amountUsd} USD (heuristic, not a quote)`,
      });
    }

    if (prefer.length) {
      const index = prefer.findIndex((label) => label === pool.dex || label === pool.source.provider);
      factors.push({
        name: "preference",
        score: index === -1 ? 0 : 1 - index / prefer.length,
        weight: weights.preference,
        origin: null,
        detail: index === -1 ? "not preferred" : `preference #${index + 1}`,
      });
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const usedWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weighted = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

    return {
      pool,
      score: usedWeight > 0 ? weighted / usedWeight : 0,
      confidence: totalWeight > 0 ? usedWeight / totalWeight : 0,
      factors,
    };
  });

  return ranked.sort((a, b) => b.score - a.score || a.pool.address.localeCompare(b.pool.address));
}
