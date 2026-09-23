/**
 * `sdk.trading` — Phase 7 integration layer.
 *
 * Connects the existing layers into one flow without duplicating them:
 *   discovery (sdk.tokens.discovery) → token (sdk.tokens.get / metadata)
 *   → pools (sdk.pools.find) → quote / build / simulate / execute (sdk.swap).
 *
 * It never fetches anything itself; every call delegates to the existing
 * client, and every value keeps the source it came from.
 */
import { UnsupportedOperationError, ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  isValidAddress,
} from "../utils/address.js";
import type { TokenClient } from "../tokens/TokenClient.js";
import type { PoolClient } from "../pools/PoolClient.js";
import type { SwapClient } from "../swap/SwapClient.js";
import type { DiscoveredToken, DiscoveryPage, DiscoverySort } from "../discovery/types.js";
import type { LiquidityPool } from "../pools/types.js";
import type { SwapBuildResult, SwapQuote } from "../swap/types.js";
import type {
  BuyQuoteParams,
  SellQuoteParams,
  SourcedValue,
  TokenTradingView,
  TradeTrace,
  TradingDiscoveryCategory,
  TradingPoolSummary,
  TradingRoute,
  TradingViewOptions,
} from "./types.js";

const INFRA_PROGRAMS = new Set<Address>([
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
]);

const CATEGORY_SORT: Record<Exclude<TradingDiscoveryCategory, "search">, DiscoverySort> = {
  new: "new",
  trending: "trending",
  recent: "recent",
  volume: "volume",
};

export interface TradingDiscoverOptions {
  query?: string;
  limit?: number;
  cursor?: string | null;
  provider?: string;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clean(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/\0/g, "").trim();
  return v.length ? v : null;
}

export class TradingClient {
  constructor(
    private readonly tokens: TokenClient,
    private readonly pools: PoolClient,
    private readonly swap: SwapClient,
    private readonly rpcProviderName: string,
  ) {}

  /** Categories the active (or named) discovery provider genuinely supports. */
  public categories(provider?: string): TradingDiscoveryCategory[] {
    const d = this.tokens.discovery;
    const out: TradingDiscoveryCategory[] = [];
    if (d.supports("search", provider)) out.push("search");
    const sorts = d.sorts(provider);
    for (const [category, sort] of Object.entries(CATEGORY_SORT)) {
      if (sorts.includes(sort)) out.push(category as TradingDiscoveryCategory);
    }
    return out;
  }

  /**
   * New / trending / recent / high-volume / search. Delegates to
   * sdk.tokens.discovery and throws UnsupportedOperationError when the
   * provider cannot serve a category — rankings are never synthesized.
   */
  public async discover(
    category: TradingDiscoveryCategory,
    options: TradingDiscoverOptions = {},
  ): Promise<DiscoveryPage<DiscoveredToken>> {
    const call = options.provider ? { provider: options.provider } : {};
    const page = { ...(options.limit !== undefined ? { limit: options.limit } : {}), cursor: options.cursor ?? null };
    if (category === "search") {
      if (!options.query) throw new ValidationError("search requires a query", "query");
      return this.tokens.discovery.search({ query: options.query, ...page }, call);
    }
    const sort = CATEGORY_SORT[category];
    if (!sort) throw new ValidationError(`Unknown discovery category "${String(category)}"`, "category");
    return this.tokens.discovery.list({ sort, ...page }, call);
  }

  /**
   * Token detail view: mint (sdk.tokens.get) + metadata (sdk.tokens.metadata)
   * + discovery market data (sdk.tokens.discovery.get) + pools (sdk.pools.find).
   * Only the mint read is required; other layers degrade to warnings.
   */
  public async view(mint: Address, options: TradingViewOptions = {}): Promise<TokenTradingView> {
    if (!isValidAddress(mint)) throw new ValidationError(`"${mint}" is not a valid mint address`, "mint");
    const warnings: string[] = [];

    const [token, metaResult, discoveryResult, poolResult] = await Promise.all([
      this.tokens.get(mint),
      this.tokens
        .metadata(mint, { offChain: options.offChainMetadata === true })
        .then((value) => ({ value, error: null as string | null }))
        .catch((e: unknown) => ({ value: null, error: message(e) })),
      options.skipDiscovery
        ? Promise.resolve({ value: null, error: null as string | null })
        : this.tokens.discovery
            .get(mint, options.discoveryProvider ? { provider: options.discoveryProvider } : {})
            .then((value) => ({ value, error: null as string | null }))
            .catch((e: unknown) => ({ value: null, error: message(e) })),
      options.skipPools
        ? Promise.resolve({ value: [] as LiquidityPool[], provider: null as string | null, error: null as string | null })
        : this.pools
            .find({ token: mint })
            .then((p) => ({ value: p.items, provider: p.source.provider as string | null, error: null as string | null }))
            .catch((e: unknown) => ({ value: [] as LiquidityPool[], provider: null, error: message(e) })),
    ]);

    if (metaResult.error) warnings.push(`metadata unavailable: ${metaResult.error}`);
    if (discoveryResult.error) warnings.push(`discovery unavailable: ${discoveryResult.error}`);
    if (poolResult.error) warnings.push(`pools unavailable: ${poolResult.error}`);
    if (!poolResult.error && !options.skipPools && poolResult.value.length === 0) {
      warnings.push("no registered pool provider knows a pool for this token");
    }

    const meta = metaResult.value;
    const disc = discoveryResult.value;
    const discSrc = disc ? { origin: "discovery" as const, provider: disc.source.provider } : null;
    const onChainSrc = { origin: "on-chain-metadata" as const, provider: this.rpcProviderName };
    const offChainSrc = { origin: "off-chain-metadata" as const, provider: meta?.offChain.uri ?? "uri" };

    const pick = (candidates: Array<[string | null, SourcedValue<string>["source"] | null]>): SourcedValue<string> | null => {
      for (const [value, source] of candidates) if (value && source) return { value, source };
      return null;
    };

    const onChain = meta?.onChain ?? null;
    const offOk = meta?.offChain.status === "ok" ? meta.offChain : null;

    return {
      mint,
      name: pick([[clean(onChain?.name), onChainSrc], [clean(offOk?.name), offChainSrc], [clean(disc?.name), discSrc]]),
      symbol: pick([[clean(onChain?.symbol), onChainSrc], [clean(offOk?.symbol), offChainSrc], [clean(disc?.symbol), discSrc]]),
      decimals: { value: token.mint.decimals, source: { origin: "mint", provider: this.rpcProviderName } },
      image: pick([[clean(offOk?.image), offChainSrc], [clean(disc?.logoUri), discSrc]]),
      description: pick([[clean(offOk?.description), offChainSrc]]),
      market: disc?.market ? { data: disc.market, source: disc.source } : null,
      layers: {
        token: { value: token, source: { origin: "mint", provider: this.rpcProviderName } },
        metadata: metaResult,
        discovery: discoveryResult,
        pools: poolResult,
      },
      pools: poolResult.value.map((p) => summarizePool(p, mint)),
      routes: groupRoutes(poolResult.value, mint),
      warnings,
    };
  }

  /** Buy `mint` with SOL (default), USDC or any token. Delegates to sdk.swap.quote. */
  public quoteBuy(params: BuyQuoteParams): Promise<SwapQuote> {
    this.assertMint(params.mint);
    return this.swap.quote({
      input: params.spend ?? "SOL",
      output: params.mint,
      amount: params.amount,
      ...(params.slippageBps !== undefined ? { slippageBps: params.slippageBps } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
    });
  }

  /** Sell `mint` for SOL (default), USDC or any token. Delegates to sdk.swap.quote. */
  public quoteSell(params: SellQuoteParams): Promise<SwapQuote> {
    this.assertMint(params.mint);
    return this.swap.quote({
      input: params.mint,
      output: params.receive ?? "SOL",
      amount: params.amount,
      ...(params.slippageBps !== undefined ? { slippageBps: params.slippageBps } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
    });
  }

  /**
   * Provider transparency: which swap provider quoted, which pool providers
   * and DEXes the route uses, and — once built — which programs execute.
   */
  public async trace(input: SwapQuote | SwapBuildResult): Promise<TradeTrace> {
    const built = "transaction" in input && "instructions" in input ? input : null;
    const quote = built ? built.quote : (input as SwapQuote);
    const hops = await Promise.all(
      quote.route.map(async (hop) => {
        const pool = await this.pools.get(hop.pool).catch(() => null);
        return {
          pool: hop.pool,
          dex: hop.dex,
          poolProgramId: pool?.programId ?? null,
          poolProvider: pool?.source.provider ?? null,
          reserveOrigin: hop.reserveOrigin,
        };
      }),
    );
    const executingPrograms = built ? [...new Set(built.instructions.map((ix) => ix.programId))] : null;
    return {
      swapProvider: quote.provider,
      quote: {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        minOutAmount: quote.minOutAmount,
        slippageBps: quote.slippageBps,
        priceImpactBps: quote.priceImpactBps,
      },
      hops,
      executingPrograms,
      swapPrograms: executingPrograms ? executingPrograms.filter((p) => !INFRA_PROGRAMS.has(p)) : null,
    };
  }

  private assertMint(mint: Address): void {
    if (!isValidAddress(mint)) throw new ValidationError(`"${mint}" is not a valid mint address`, "mint");
    if (mint === WRAPPED_SOL_MINT) {
      throw new UnsupportedOperationError("mint is wSOL; use sdk.swap.quote directly for SOL-denominated pairs");
    }
  }
}

function summarizePool(pool: LiquidityPool, mint: Address): TradingPoolSummary {
  const other = pool.tokenA.mint === mint ? pool.tokenB : pool.tokenA;
  const self = pool.tokenA.mint === mint ? pool.tokenA : pool.tokenB;
  const l = pool.liquidity;
  const liquidityUsd = l.indexedUsd
    ? { ...l.indexedUsd, kind: "indexed" as const }
    : l.tvlUsd
      ? { ...l.tvlUsd, kind: "tvl" as const }
      : l.estimatedUsd
        ? { ...l.estimatedUsd, kind: "estimated" as const }
        : null;
  return {
    address: pool.address,
    dex: pool.dex,
    programId: pool.programId,
    pair: `${self.symbol ?? short(self.mint)}/${other.symbol ?? short(other.mint)}`,
    pairedMint: other.mint,
    liquidityUsd,
    price: pool.price,
    feeBps: pool.fee.bps,
    hasReserves: l.hasReserves,
    provider: pool.source.provider,
  };
}

function groupRoutes(pools: readonly LiquidityPool[], mint: Address): TradingRoute[] {
  const byPair = new Map<Address, TradingRoute>();
  for (const pool of pools) {
    const other = pool.tokenA.mint === mint ? pool.tokenB : pool.tokenA;
    const route = byPair.get(other.mint) ?? { pairedMint: other.mint, pairedSymbol: other.symbol, pools: [], dexes: [] };
    route.pools.push(pool.address);
    if (!route.dexes.includes(pool.dex)) route.dexes.push(pool.dex);
    route.pairedSymbol ??= other.symbol;
    byPair.set(other.mint, route);
  }
  return [...byPair.values()];
}

function short(a: string): string {
  return `${a.slice(0, 4)}…`;
}
