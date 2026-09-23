/**
 * Application-defined pool discovery over an in-memory pool set.
 *
 * Useful for curated venue lists, cached indexer snapshots, fixtures and
 * tests. The data comes from whoever supplied it, so results default to the
 * "indexed" origin — the SDK does not claim third-party reserves are chain
 * state. Declare `origin: "on-chain"` only for values you read yourself.
 *
 * Capabilities are derived from the data actually present: a pool set without
 * volume figures reports `volume: false` rather than sorting on undefined.
 */
import { UnsupportedOperationError, ValidationError } from "../../errors/index.js";
import type { Address } from "../../types/index.js";
import { isValidAddress } from "../../utils/address.js";
import {
  poolCapabilities,
  type LiquidityPool,
  type PoolCapabilities,
  type PoolDataOrigin,
  type PoolFee,
  type PoolLiquidity,
  type PoolPage,
  type PoolProvider,
  type PoolQuery,
  type PoolTokenSide,
  type PoolType,
  type PoolValue,
} from "../types.js";

/** One side of a supplied pool entry. Only `mint` is required. */
export interface StaticPoolSide {
  mint: Address;
  symbol?: string | null;
  decimals?: number | null;
  /** Raw reserve in base units. Accepts bigint, number or decimal string. */
  reserveRaw?: bigint | number | string | null;
}

/** One entry of a supplied pool set. */
export interface StaticPoolEntry {
  address: Address;
  dex?: string;
  poolType?: PoolType;
  programId?: Address | null;
  tokenA: StaticPoolSide;
  tokenB: StaticPoolSide;
  /** Price of tokenA in tokenB. */
  price?: number | null;
  /** Provider-reported liquidity in USD. */
  liquidityUsd?: number | null;
  /** Provider-reported total value locked in USD. */
  tvlUsd?: number | null;
  volume24hUsd?: number | null;
  /** Fee in basis points (30 = 0.30%). */
  feeBps?: number | null;
  createdAt?: string | null;
  createdSignature?: string | null;
  raw?: unknown;
}

export interface StaticPoolProviderOptions {
  name?: string;
  /** Protocol label used when an entry does not declare its own. */
  dex?: string;
  pools: readonly StaticPoolEntry[];
  /** Defaults to "indexed". Use "on-chain" only for self-read values. */
  origin?: PoolDataOrigin;
  attribution?: string;
  asOf?: string;
  /** Default page size. Default 20. */
  defaultLimit?: number;
}

const MAX_LIMIT = 200;

function toBigInt(value: bigint | number | string | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return BigInt(Math.trunc(value));
  }
  if (!/^-?\d+$/.test(value.trim())) return null;
  return BigInt(value.trim());
}

function uiAmount(raw: bigint | null, decimals: number | null | undefined): number | null {
  if (raw === null || decimals === null || decimals === undefined) return null;
  return Number(raw) / 10 ** decimals;
}

export class StaticPoolProvider implements PoolProvider {
  public readonly name: string;
  public readonly dex: string;
  public readonly capabilities: PoolCapabilities;

  private readonly pools: LiquidityPool[];
  private readonly defaultLimit: number;

  constructor(options: StaticPoolProviderOptions) {
    this.name = options.name ?? "static-pools";
    this.dex = options.dex ?? "multi";
    this.defaultLimit = options.defaultLimit ?? 20;

    const origin = options.origin ?? "indexed";
    this.pools = options.pools.map((entry) =>
      this.normalize(entry, origin, options.attribution, options.asOf),
    );

    const some = (predicate: (pool: LiquidityPool) => boolean) => this.pools.some(predicate);
    this.capabilities = poolCapabilities({
      findByToken: true,
      findByPair: true,
      getByAddress: true,
      pagination: true,
      reserves: some((p) => p.liquidity.hasReserves),
      liquidity: some((p) => p.liquidity.indexedUsd !== null || p.liquidity.estimatedUsd !== null),
      tvl: some((p) => p.liquidity.tvlUsd !== null),
      volume: some((p) => p.volume24hUsd !== null),
      price: some((p) => p.price !== null),
      fee: some((p) => p.fee.bps !== null),
      creation: some((p) => p.createdAt !== null || p.createdSignature !== null),
    });
  }

  public async findPools(query: PoolQuery): Promise<PoolPage<LiquidityPool>> {
    if (!isValidAddress(query.token)) {
      throw new ValidationError(`"${query.token}" is not a valid mint address`, "token");
    }
    if (query.pairedWith !== undefined && !isValidAddress(query.pairedWith)) {
      throw new ValidationError(`"${query.pairedWith}" is not a valid mint address`, "pairedWith");
    }

    const matches = this.pools.filter((pool) => {
      const mints = [pool.tokenA.mint, pool.tokenB.mint];
      if (!mints.includes(query.token)) return false;
      if (query.pairedWith) {
        const other = mints.find((m) => m !== query.token) ?? query.token;
        if (other !== query.pairedWith) return false;
      }
      if (query.dex && pool.dex !== query.dex) return false;
      return true;
    });

    return this.page(matches, query);
  }

  public async getPool(address: Address): Promise<LiquidityPool | null> {
    if (!isValidAddress(address)) {
      throw new ValidationError(`"${address}" is not a valid pool address`, "address");
    }
    return this.pools.find((pool) => pool.address === address) ?? null;
  }

  private page(matches: LiquidityPool[], query: PoolQuery): PoolPage<LiquidityPool> {
    const limit = Math.min(Math.max(1, query.limit ?? this.defaultLimit), MAX_LIMIT);
    const offset = this.decodeCursor(query.cursor);
    const items = matches.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < matches.length;
    return {
      items,
      nextCursor: hasMore ? `offset:${nextOffset}` : null,
      hasMore,
      total: matches.length,
      source: { provider: this.name, dex: this.dex },
    };
  }

  private decodeCursor(cursor: string | null | undefined): number {
    if (!cursor) return 0;
    const match = /^offset:(\d+)$/.exec(cursor);
    if (!match) {
      throw new UnsupportedOperationError(
        `Cursor "${cursor}" was not issued by provider "${this.name}". Cursors are provider-specific.`,
      );
    }
    return Number(match[1]);
  }

  private normalize(
    entry: StaticPoolEntry,
    origin: PoolDataOrigin,
    attribution: string | undefined,
    asOf: string | undefined,
  ): LiquidityPool {
    const side = (input: StaticPoolSide): PoolTokenSide => {
      const reserveRaw = toBigInt(input.reserveRaw);
      return {
        mint: input.mint,
        symbol: input.symbol ?? null,
        decimals: input.decimals ?? null,
        reserveRaw,
        reserveUi: uiAmount(reserveRaw, input.decimals),
        reserveOrigin: reserveRaw === null ? null : origin,
      };
    };

    const tokenA = side(entry.tokenA);
    const tokenB = side(entry.tokenB);

    const value = (v: number | null | undefined, unit: string): PoolValue | null =>
      v === null || v === undefined || !Number.isFinite(v) ? null : { value: v, origin, unit };

    const liquidity: PoolLiquidity = {
      hasReserves: tokenA.reserveRaw !== null && tokenB.reserveRaw !== null,
      indexedUsd: value(entry.liquidityUsd, "USD"),
      tvlUsd: value(entry.tvlUsd, "USD"),
      estimatedUsd: null,
    };

    const fee: PoolFee = {
      bps: entry.feeBps ?? null,
      origin: entry.feeBps === null || entry.feeBps === undefined ? null : origin,
    };

    return {
      address: entry.address,
      dex: entry.dex ?? this.dex,
      poolType: entry.poolType ?? "unknown",
      programId: entry.programId ?? null,
      tokenA,
      tokenB,
      price: value(entry.price, `${tokenB.symbol ?? "tokenB"} per ${tokenA.symbol ?? "tokenA"}`),
      liquidity,
      volume24hUsd: value(entry.volume24hUsd, "USD"),
      fee,
      createdAt: entry.createdAt ?? null,
      createdSignature: entry.createdSignature ?? null,
      source: {
        provider: this.name,
        dex: entry.dex ?? this.dex,
        origin,
        ...(attribution ? { attribution } : {}),
        ...(asOf ? { asOf } : {}),
      },
      raw: entry.raw ?? entry,
    };
  }
}
