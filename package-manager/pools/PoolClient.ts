/**
 * `solana.pools` — the high-level pool and liquidity discovery API.
 *
 * It orchestrates registered pool providers, enforces declared capabilities,
 * guarantees provenance on every result, and can optionally verify a pool
 * account against chain state. It performs no swaps, quotes or routing.
 */
import { ProviderError, UnsupportedOperationError, ValidationError } from "../errors/index.js";
import type { AccountReader } from "../reader/AccountReader.js";
import type { Address } from "../types/index.js";
import { isValidAddress } from "../utils/address.js";
import {
  rankPools,
  type PoolRankingOptions,
  type RankedPool,
} from "./ranking.js";
import {
  NO_POOL_CAPABILITIES,
  type LiquidityPool,
  type PoolCapabilities,
  type PoolCapability,
  type PoolPage,
  type PoolProvider,
  type PoolQuery,
} from "./types.js";

export interface PoolCallOptions {
  /** Use a specific registered provider by name instead of querying all. */
  provider?: string;
}

export interface PoolFindOptions extends PoolCallOptions {
  /**
   * Query every registered provider and merge the results (deduplicated by
   * pool address, first provider wins). Default true when no provider is
   * named — a token's pools are usually spread across protocols.
   */
  allProviders?: boolean;
  /** Ignore providers that throw instead of failing the whole call. Default true. */
  tolerateFailures?: boolean;
}

/** Result of checking a discovered pool against chain state. */
export interface PoolVerification {
  address: Address;
  /** True when an account exists at the pool address. */
  exists: boolean;
  /** Program that owns the account on chain, when it exists. */
  owner: Address | null;
  /**
   * True when the provider declared a programId and it matches the on-chain
   * owner. Null when the provider declared none — unknown, not a failure.
   */
  programMatches: boolean | null;
}

function isPoolLike(value: unknown): value is LiquidityPool {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { address?: unknown }).address === "string" &&
    typeof (value as { tokenA?: { mint?: unknown } }).tokenA?.mint === "string" &&
    typeof (value as { tokenB?: { mint?: unknown } }).tokenB?.mint === "string"
  );
}

function assertPage(provider: string, page: unknown): asserts page is PoolPage<LiquidityPool> {
  if (
    typeof page !== "object" ||
    page === null ||
    !Array.isArray((page as { items?: unknown }).items)
  ) {
    throw new ProviderError(provider, "pool response is malformed (expected { items: [] })");
  }
}

function wrap(provider: string, error: unknown, method?: string): Error {
  if (error instanceof ValidationError || error instanceof UnsupportedOperationError) return error;
  if (error instanceof ProviderError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new ProviderError(provider, `${method ? `${method}() ` : ""}failed: ${detail}`);
}

export class PoolClient {
  private readonly providers = new Map<string, PoolProvider>();
  private readonly accounts: AccountReader | null;

  constructor(providers: readonly PoolProvider[] = [], accounts: AccountReader | null = null) {
    this.accounts = accounts;
    for (const provider of providers) this.register(provider);
  }

  /** Registers a pool provider (Raydium, Orca, an indexer, your own set). */
  public register(provider: PoolProvider): this {
    this.providers.set(provider.name, provider);
    return this;
  }

  public unregister(name: string): this {
    this.providers.delete(name);
    return this;
  }

  /** Registered provider names. */
  public get names(): string[] {
    return [...this.providers.keys()];
  }

  /** Protocol labels covered by the registered providers. */
  public get dexes(): string[] {
    return [...new Set([...this.providers.values()].map((p) => p.dex))];
  }

  /**
   * Capabilities of a named provider, or the union across all of them —
   * a capability is true when at least one registered provider offers it.
   */
  public capabilities(name?: string): PoolCapabilities {
    if (name) return this.resolve(name).capabilities;
    const merged: Record<string, boolean> = { ...NO_POOL_CAPABILITIES };
    for (const provider of this.providers.values()) {
      for (const [key, value] of Object.entries(provider.capabilities)) {
        if (value) merged[key] = true;
      }
    }
    return Object.freeze(merged) as PoolCapabilities;
  }

  public supports(capability: PoolCapability, name?: string): boolean {
    return this.capabilities(name)[capability] === true;
  }

  /**
   * Finds the known pools for a token. Matches the token on either side, so
   * token/SOL, token/USDC and token/any-SPL pairs are all returned; pass
   * `pairedWith` to narrow to one quote asset.
   *
   * An empty result means "no registered provider knows of a pool" — not that
   * the token is untradeable. A token can exist with no usable pool at all.
   */
  public async find(
    query: PoolQuery | Address,
    options: PoolFindOptions = {},
  ): Promise<PoolPage<LiquidityPool>> {
    const request: PoolQuery = typeof query === "string" ? { token: query } : query;
    if (!isValidAddress(request.token)) {
      throw new ValidationError(`"${request.token}" is not a valid mint address`, "token");
    }
    if (this.providers.size === 0) {
      throw new UnsupportedOperationError(
        "No pool provider is registered. Register one with solana.pools.register(provider).",
      );
    }

    if (options.provider) {
      const provider = this.resolve(options.provider);
      this.assertFindable(provider, request);
      return this.runFind(provider, request);
    }

    const candidates = [...this.providers.values()].filter(
      (provider) =>
        provider.capabilities.findByToken &&
        (!request.pairedWith || provider.capabilities.findByPair) &&
        (!request.dex || provider.dex === request.dex || provider.dex === "multi"),
    );
    if (candidates.length === 0) {
      throw new UnsupportedOperationError(
        request.dex
          ? `No registered pool provider covers dex "${request.dex}".`
          : "No registered pool provider supports finding pools by token.",
      );
    }
    if (options.allProviders === false) {
      return this.runFind(candidates[0]!, request);
    }

    const tolerate = options.tolerateFailures !== false;
    const pages = await Promise.all(
      candidates.map(async (provider) => {
        try {
          return await this.runFind(provider, request);
        } catch (error) {
          if (!tolerate) throw error;
          return null;
        }
      }),
    );

    const seen = new Set<Address>();
    const items: LiquidityPool[] = [];
    let hasMore = false;
    let nextCursor: string | null = null;
    for (const page of pages) {
      if (!page) continue;
      if (page.hasMore && page.nextCursor && !nextCursor) nextCursor = page.nextCursor;
      hasMore ||= page.hasMore;
      for (const pool of page.items) {
        if (seen.has(pool.address)) continue;
        seen.add(pool.address);
        items.push(pool);
      }
    }

    return {
      items,
      // A merged cursor cannot be resumed across providers; paginate a single
      // provider with `{ provider: name }` when you need cursor continuation.
      nextCursor: candidates.length === 1 ? nextCursor : null,
      hasMore: candidates.length === 1 ? hasMore : false,
      total: items.length,
      source: { provider: candidates.map((p) => p.name).join("+"), dex: "multi" },
    };
  }

  /** Normalized details for one pool address. Null when nobody knows it. */
  public async get(address: Address, options: PoolCallOptions = {}): Promise<LiquidityPool | null> {
    if (!isValidAddress(address)) {
      throw new ValidationError(`"${address}" is not a valid pool address`, "address");
    }
    const ordered = options.provider
      ? [this.resolve(options.provider)]
      : [...this.providers.values()];
    if (ordered.length === 0) {
      throw new UnsupportedOperationError(
        "No pool provider is registered. Register one with solana.pools.register(provider).",
      );
    }

    let lastError: unknown = null;
    for (const provider of ordered) {
      if (!provider.capabilities.getByAddress) continue;
      try {
        const pool = await provider.getPool(address);
        if (pool === null) continue;
        if (!isPoolLike(pool)) {
          throw new ProviderError(provider.name, "getPool() returned a malformed pool");
        }
        return pool;
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        lastError = error;
      }
    }
    if (lastError) throw wrap(ordered[0]!.name, lastError, "getPool");
    return null;
  }

  /**
   * Scores pools by liquidity, volume, fee, estimated price impact and
   * provider preference. This is venue selection groundwork, not routing:
   * it never quotes, splits or executes a trade.
   */
  public rank(pools: readonly LiquidityPool[], options: PoolRankingOptions = {}): RankedPool[] {
    return rankPools(pools, options);
  }

  /** Convenience: find a token's pools and return them ranked, best first. */
  public async best(
    query: PoolQuery | Address,
    options: PoolFindOptions & PoolRankingOptions = {},
  ): Promise<RankedPool[]> {
    const page = await this.find(query, options);
    return this.rank(page.items, options);
  }

  /**
   * Checks a pool address against chain state: does an account exist, and
   * does its owning program match what the provider claimed? Requires an
   * RPC-backed client.
   */
  public async verify(pool: LiquidityPool | Address): Promise<PoolVerification> {
    if (!this.accounts) {
      throw new UnsupportedOperationError(
        "Pool verification requires an RPC-backed client (solana.pools from SolanaClient).",
      );
    }
    const address = typeof pool === "string" ? pool : pool.address;
    if (!isValidAddress(address)) {
      throw new ValidationError(`"${address}" is not a valid pool address`, "address");
    }
    const declaredProgram = typeof pool === "string" ? null : pool.programId;
    const account = await this.accounts.get(address);
    const owner = (account?.owner as Address | undefined) ?? null;
    return {
      address,
      exists: account !== null,
      owner,
      programMatches: declaredProgram === null ? null : owner === declaredProgram,
    };
  }

  private assertFindable(provider: PoolProvider, request: PoolQuery): void {
    if (!provider.capabilities.findByToken) {
      throw new UnsupportedOperationError(
        `Pool provider "${provider.name}" does not support finding pools by token.`,
      );
    }
    if (request.pairedWith && !provider.capabilities.findByPair) {
      throw new UnsupportedOperationError(
        `Pool provider "${provider.name}" does not support pair filtering.`,
      );
    }
  }

  private resolve(name: string): PoolProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ValidationError(
        `Unknown pool provider "${name}". Registered: ${this.names.join(", ") || "none"}.`,
        "provider",
      );
    }
    return provider;
  }

  private async runFind(provider: PoolProvider, request: PoolQuery): Promise<PoolPage<LiquidityPool>> {
    let page: unknown;
    try {
      page = await provider.findPools(request);
    } catch (error) {
      throw wrap(provider.name, error, "findPools");
    }
    assertPage(provider.name, page);
    const items = page.items.filter(isPoolLike);
    return {
      items,
      nextCursor: page.nextCursor ?? null,
      hasMore: page.hasMore === true && Boolean(page.nextCursor),
      ...(page.total !== undefined ? { total: page.total } : {}),
      source: page.source ?? { provider: provider.name, dex: provider.dex },
    };
  }
}
