/**
 * `solana.tokens.discovery` — the high-level discovery API.
 *
 * It orchestrates registered providers, enforces declared capabilities, and
 * guarantees provenance on every result. It is not a parallel client: it hangs
 * off the existing SolanaClient token module and reuses the same reader.
 */
import { ProviderError, UnsupportedOperationError, ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import { isValidAddress } from "../utils/address.js";
import {
  type DiscoveredToken,
  type DiscoveryCapabilities,
  type DiscoveryCapability,
  type DiscoveryListQuery,
  type DiscoveryPage,
  type DiscoverySearchQuery,
  type DiscoverySort,
  type TokenDiscoveryProvider,
} from "./types.js";

export interface DiscoveryCallOptions {
  /** Use a specific registered provider by name instead of the default. */
  provider?: string;
}

function isDiscoveredTokenLike(value: unknown): value is DiscoveredToken {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { mint?: unknown }).mint === "string"
  );
}

function assertPage(
  provider: string,
  page: unknown,
): asserts page is DiscoveryPage<DiscoveredToken> {
  if (typeof page !== "object" || page === null || !Array.isArray((page as { items?: unknown }).items)) {
    throw new ProviderError(provider, "discovery response is malformed (expected { items: [] })");
  }
}

export class TokenDiscoveryClient {
  private readonly providers = new Map<string, TokenDiscoveryProvider>();
  private defaultProvider: string | null = null;

  constructor(providers: readonly TokenDiscoveryProvider[] = []) {
    for (const provider of providers) this.register(provider);
  }

  /** Registers a provider. The first registered provider becomes the default. */
  public register(provider: TokenDiscoveryProvider, options: { default?: boolean } = {}): this {
    this.providers.set(provider.name, provider);
    if (options.default || this.defaultProvider === null) this.defaultProvider = provider.name;
    return this;
  }

  public unregister(name: string): this {
    this.providers.delete(name);
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.keys().next().value ?? null;
    }
    return this;
  }

  /** Makes an already-registered provider the default. */
  public useDefault(name: string): this {
    this.resolve(name);
    this.defaultProvider = name;
    return this;
  }

  /** Registered provider names. */
  public get names(): string[] {
    return [...this.providers.keys()];
  }

  public get provider(): TokenDiscoveryProvider {
    return this.resolve();
  }

  /** Capabilities of the default (or named) provider. */
  public capabilities(name?: string): DiscoveryCapabilities {
    return this.resolve(name).capabilities;
  }

  /** Sorting modes the default (or named) provider actually supports. */
  public sorts(name?: string): readonly DiscoverySort[] {
    return this.resolve(name).sorts;
  }

  public supports(capability: DiscoveryCapability, name?: string): boolean {
    return this.resolve(name).capabilities[capability] === true;
  }

  /**
   * Search by symbol, name or mint address.
   *
   * A base58 mint address is always resolvable through the on-chain provider,
   * so mint lookup never depends on an external indexer being registered.
   */
  public async search(
    query: string | DiscoverySearchQuery,
    options: DiscoveryCallOptions = {},
  ): Promise<DiscoveryPage<DiscoveredToken>> {
    const request: DiscoverySearchQuery = typeof query === "string" ? { query } : query;
    if (typeof request.query !== "string" || request.query.trim().length === 0) {
      throw new ValidationError("Search query must be a non-empty string", "query");
    }
    const provider = this.resolve(options.provider);
    if (!provider.capabilities.search) {
      throw new UnsupportedOperationError(
        `Discovery provider "${provider.name}" does not support search.`,
      );
    }
    return this.run(provider, "search", () => provider.search(request));
  }

  /** List tokens by a provider-supported sort mode. */
  public async list(
    query: DiscoveryListQuery = {},
    options: DiscoveryCallOptions = {},
  ): Promise<DiscoveryPage<DiscoveredToken>> {
    const provider = this.resolve(options.provider);
    if (query.sort && !provider.sorts.includes(query.sort)) {
      throw new UnsupportedOperationError(
        `Discovery provider "${provider.name}" does not support sort "${query.sort}". Supported: ${provider.sorts.join(", ") || "none"}.`,
      );
    }
    return this.run(provider, "list", () => provider.list(query));
  }

  /**
   * Single-token lookup by mint. Falls back to any provider that can resolve a
   * mint, so this keeps working without an indexer.
   */
  public async get(mint: Address, options: DiscoveryCallOptions = {}): Promise<DiscoveredToken | null> {
    if (!isValidAddress(mint)) throw new ValidationError(`"${mint}" is not a valid mint address`, "mint");
    const primary = this.resolve(options.provider);
    const ordered = options.provider
      ? [primary]
      : [primary, ...[...this.providers.values()].filter((p) => p !== primary)];

    let lastError: unknown = null;
    for (const provider of ordered) {
      if (!provider.capabilities.searchByMint) continue;
      try {
        const result = await provider.get(mint);
        if (result === null) continue;
        if (!isDiscoveredTokenLike(result)) {
          throw new ProviderError(provider.name, "get() returned a malformed token");
        }
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof ProviderError) throw lastError;
    if (lastError) throw wrap(ordered[0]?.name ?? "discovery", lastError);
    return null;
  }

  /** Walks every page of a search or list call. Guards against stuck cursors. */
  public async *paginate(
    kind: "search" | "list",
    query: DiscoverySearchQuery | DiscoveryListQuery,
    options: DiscoveryCallOptions = {},
  ): AsyncGenerator<DiscoveredToken[], void, void> {
    let cursor: string | null | undefined = query.cursor ?? null;
    const seen = new Set<string>();
    for (;;) {
      const page: DiscoveryPage<DiscoveredToken> =
        kind === "search"
          ? await this.search({ ...(query as DiscoverySearchQuery), cursor }, options)
          : await this.list({ ...(query as DiscoveryListQuery), cursor }, options);
      if (page.items.length) yield page.items;
      if (!page.hasMore || !page.nextCursor || seen.has(page.nextCursor)) return;
      seen.add(page.nextCursor);
      cursor = page.nextCursor;
    }
  }

  private resolve(name?: string): TokenDiscoveryProvider {
    const key = name ?? this.defaultProvider;
    if (!key) {
      throw new UnsupportedOperationError(
        "No token discovery provider is registered. Register one with solana.tokens.discovery.register(provider).",
      );
    }
    const provider = this.providers.get(key);
    if (!provider) {
      throw new ValidationError(
        `Unknown discovery provider "${key}". Registered: ${this.names.join(", ") || "none"}.`,
        "provider",
      );
    }
    return provider;
  }

  private async run(
    provider: TokenDiscoveryProvider,
    method: string,
    call: () => Promise<DiscoveryPage<DiscoveredToken>>,
  ): Promise<DiscoveryPage<DiscoveredToken>> {
    let page: unknown;
    try {
      page = await call();
    } catch (error) {
      throw wrap(provider.name, error, method);
    }
    assertPage(provider.name, page);
    const items = page.items.filter(isDiscoveredTokenLike).map((token) => ({
      ...token,
      source: token.source ?? { provider: provider.name, origin: "indexed" as const },
    }));
    return {
      items,
      nextCursor: typeof page.nextCursor === "string" ? page.nextCursor : null,
      hasMore: page.hasMore === true && typeof page.nextCursor === "string",
      ...(typeof page.total === "number" ? { total: page.total } : {}),
      source: page.source ?? { provider: provider.name, origin: "indexed" },
    };
  }
}

function wrap(provider: string, error: unknown, method?: string): Error {
  if (
    error instanceof UnsupportedOperationError ||
    error instanceof ValidationError ||
    error instanceof ProviderError
  ) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ProviderError(provider, method ? `${method}() failed: ${message}` : message);
}
