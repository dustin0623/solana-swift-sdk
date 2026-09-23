/**
 * Application-defined discovery over a token list held in memory.
 *
 * Useful for curated lists, cached indexer snapshots and tests. The data comes
 * from whoever supplied the list, so results are attributed as "indexed"
 * unless the caller explicitly declares an on-chain origin.
 *
 * Capabilities are derived from the data actually present: a list without
 * volume figures reports `volume: false` instead of sorting by undefined.
 */
import { UnsupportedOperationError } from "../../errors/index.js";
import type { Address } from "../../types/index.js";
import type { TokenProgram } from "../../types/token.js";
import { isValidAddress } from "../../utils/address.js";
import {
  capabilities,
  type DiscoveredToken,
  type DiscoveryCapabilities,
  type DiscoveryDataOrigin,
  type DiscoveryListQuery,
  type DiscoveryMarketData,
  type DiscoveryPage,
  type DiscoverySearchQuery,
  type DiscoverySort,
  type DiscoverySource,
  type TokenDiscoveryProvider,
} from "../types.js";

/** One entry of a supplied token list. Only `mint` is required. */
export interface StaticTokenEntry {
  mint: Address;
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logoUri?: string | null;
  program?: TokenProgram | null;
  createdAt?: string | null;
  verification?: DiscoveredToken["verification"];
  market?: DiscoveryMarketData | null;
  raw?: unknown;
}

export interface StaticTokenListProviderOptions {
  name?: string;
  entries: readonly StaticTokenEntry[];
  /** Defaults to "indexed"; use "on-chain" only for values you read from chain yourself. */
  origin?: DiscoveryDataOrigin;
  attribution?: string;
  /** Default page size. Default 20. */
  defaultLimit?: number;
}

const MAX_LIMIT = 200;

function has<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export class StaticTokenListProvider implements TokenDiscoveryProvider {
  public readonly name: string;
  public readonly capabilities: DiscoveryCapabilities;
  public readonly sorts: readonly DiscoverySort[];

  private readonly entries: DiscoveredToken[];
  private readonly defaultLimit: number;
  private readonly origin: DiscoveryDataOrigin;
  private readonly attribution: string | undefined;

  constructor(options: StaticTokenListProviderOptions) {
    this.name = options.name ?? "static-list";
    this.origin = options.origin ?? "indexed";
    this.attribution = options.attribution;
    this.defaultLimit = options.defaultLimit ?? 20;

    this.entries = options.entries.map((entry) => this.normalize(entry));

    const anyCreatedAt = this.entries.some((t) => has(t.createdAt));
    const anyVolume = this.entries.some((t) => has(t.market?.volume24h));
    const anyLiquidity = this.entries.some((t) => has(t.market?.liquidity));
    const anyPrice = this.entries.some((t) => has(t.market?.price));

    const sorts: DiscoverySort[] = [];
    if (anyCreatedAt) sorts.push("new", "recent");
    if (anyVolume) sorts.push("volume");
    if (anyLiquidity) sorts.push("liquidity");
    this.sorts = Object.freeze(sorts);

    this.capabilities = capabilities({
      search: true,
      searchByMint: true,
      searchBySymbol: true,
      searchByName: true,
      metadata: true,
      pagination: true,
      newTokens: anyCreatedAt,
      volume: anyVolume,
      liquidity: anyLiquidity,
      price: anyPrice,
      // No trend signal exists in a static list.
      trending: false,
    });
  }

  private get source(): DiscoverySource {
    return {
      provider: this.name,
      origin: this.origin,
      ...(this.attribution ? { attribution: this.attribution } : {}),
    };
  }

  private normalize(entry: StaticTokenEntry): DiscoveredToken {
    if (!isValidAddress(entry.mint)) {
      // Keep the entry but never claim it is a valid mint elsewhere.
      // Callers can still see it in `raw`.
    }
    return {
      mint: entry.mint,
      name: entry.name ?? null,
      symbol: entry.symbol ?? null,
      decimals: entry.decimals ?? null,
      logoUri: entry.logoUri ?? null,
      program: entry.program ?? null,
      createdAt: entry.createdAt ?? null,
      verification: entry.verification ?? "unknown",
      market: entry.market ?? null,
      source: this.source,
      raw: entry.raw ?? entry,
    };
  }

  public async search(query: DiscoverySearchQuery): Promise<DiscoveryPage<DiscoveredToken>> {
    const term = query.query.trim().toLowerCase();
    const match = query.match ?? (["mint", "symbol", "name"] as const);
    const matched = term.length
      ? this.entries.filter((token) => {
          if (match.includes("mint") && token.mint.toLowerCase() === term) return true;
          if (match.includes("symbol") && token.symbol?.toLowerCase().includes(term)) return true;
          if (match.includes("name") && token.name?.toLowerCase().includes(term)) return true;
          return false;
        })
      : [];
    return this.paginate(matched, query);
  }

  public async list(query: DiscoveryListQuery): Promise<DiscoveryPage<DiscoveredToken>> {
    const sort = query.sort;
    if (sort && !this.sorts.includes(sort)) {
      throw new UnsupportedOperationError(
        `Discovery provider "${this.name}" does not support sort "${sort}". Supported: ${this.sorts.join(", ") || "none"}.`,
      );
    }
    const items = [...this.entries];
    if (sort === "new" || sort === "recent") {
      items.sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));
    } else if (sort === "volume") {
      items.sort((a, b) => (b.market?.volume24h ?? 0) - (a.market?.volume24h ?? 0));
    } else if (sort === "liquidity") {
      items.sort((a, b) => (b.market?.liquidity ?? 0) - (a.market?.liquidity ?? 0));
    }
    return this.paginate(items, query);
  }

  public async get(mint: Address): Promise<DiscoveredToken | null> {
    return this.entries.find((token) => token.mint === mint) ?? null;
  }

  private paginate(
    items: DiscoveredToken[],
    query: { limit?: number | undefined; cursor?: string | null | undefined },
  ): DiscoveryPage<DiscoveredToken> {
    const limit = Math.min(Math.max(query.limit ?? this.defaultLimit, 1), MAX_LIMIT);
    const offset = decodeCursor(query.cursor, this.name);
    const page = items.slice(offset, offset + limit);
    const next = offset + page.length;
    const hasMore = next < items.length;
    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(next) : null,
      hasMore,
      total: items.length,
      source: this.source,
    };
  }
}

/** Cursors are opaque to callers; this provider encodes an offset. */
function encodeCursor(offset: number): string {
  return `offset:${offset}`;
}

function decodeCursor(cursor: string | null | undefined, provider: string): number {
  if (!cursor) return 0;
  const value = cursor.startsWith("offset:") ? Number(cursor.slice(7)) : Number.NaN;
  if (!Number.isInteger(value) || value < 0) {
    throw new UnsupportedOperationError(
      `Cursor "${cursor}" was not issued by discovery provider "${provider}". Cursors are provider-specific.`,
    );
  }
  return value;
}
