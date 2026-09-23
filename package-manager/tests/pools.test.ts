import { describe, expect, it } from "vitest";
import { SolanaClient } from "../core/SolanaClient.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { PoolClient } from "../pools/PoolClient.js";
import { StaticPoolProvider } from "../pools/providers/StaticPoolProvider.js";
import { rankPools } from "../pools/ranking.js";
import {
  poolCapabilities,
  type LiquidityPool,
  type PoolPage,
  type PoolProvider,
  type PoolQuery,
} from "../pools/types.js";
import { ProviderError, UnsupportedOperationError, ValidationError } from "../errors/index.js";
import { base58Encode } from "../utils/base58.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));

const SOL = addr(1);
const USDC = addr(2);
const BONK = addr(3);
const LONELY = addr(4);
const RAY_PROGRAM = addr(9);

const poolA = addr(101);
const poolB = addr(102);
const poolC = addr(103);

function provider(name = "static-pools", dex = "multi"): StaticPoolProvider {
  return new StaticPoolProvider({
    name,
    dex,
    attribution: "test fixture",
    pools: [
      {
        address: poolA,
        dex: "raydium",
        poolType: "amm",
        programId: RAY_PROGRAM,
        tokenA: { mint: BONK, symbol: "BONK", decimals: 5, reserveRaw: "500000000000" },
        tokenB: { mint: SOL, symbol: "SOL", decimals: 9, reserveRaw: "2000000000000" },
        price: 0.0000004,
        liquidityUsd: 250_000,
        volume24hUsd: 90_000,
        feeBps: 25,
        createdAt: "2024-05-01T00:00:00Z",
      },
      {
        address: poolB,
        dex: "orca",
        poolType: "clmm",
        tokenA: { mint: BONK, symbol: "BONK", decimals: 5 },
        tokenB: { mint: USDC, symbol: "USDC", decimals: 6 },
        liquidityUsd: 40_000,
        feeBps: 5,
      },
      {
        address: poolC,
        dex: "orca",
        poolType: "amm",
        tokenA: { mint: SOL, symbol: "SOL", decimals: 9 },
        tokenB: { mint: USDC, symbol: "USDC", decimals: 6 },
        liquidityUsd: 9_000_000,
      },
    ],
  });
}

function client(): PoolClient {
  return new PoolClient([provider()]);
}

describe("pool model and normalization", () => {
  it("normalizes reserves, fee, price and provenance", async () => {
    const pool = (await client().get(poolA))!;
    expect(pool.dex).toBe("raydium");
    expect(pool.poolType).toBe("amm");
    expect(pool.programId).toBe(RAY_PROGRAM);
    expect(pool.tokenA.reserveRaw).toBe(500000000000n);
    expect(pool.tokenA.reserveUi).toBeCloseTo(5_000_000);
    expect(pool.tokenB.reserveUi).toBeCloseTo(2000);
    expect(pool.fee.bps).toBe(25);
    expect(pool.source.provider).toBe("static-pools");
    expect(pool.source.attribution).toBe("test fixture");
  });

  it("marks third-party figures as indexed, never on-chain", async () => {
    const pool = (await client().get(poolA))!;
    expect(pool.source.origin).toBe("indexed");
    expect(pool.liquidity.indexedUsd).toEqual({ value: 250_000, origin: "indexed", unit: "USD" });
    expect(pool.liquidity.estimatedUsd).toBeNull();
    expect(pool.tokenA.reserveOrigin).toBe("indexed");
  });

  it("keeps missing fields null instead of inventing them", async () => {
    const pool = (await client().get(poolB))!;
    expect(pool.tokenA.reserveRaw).toBeNull();
    expect(pool.tokenA.reserveUi).toBeNull();
    expect(pool.liquidity.hasReserves).toBe(false);
    expect(pool.price).toBeNull();
    expect(pool.createdAt).toBeNull();
    expect(pool.programId).toBeNull();
  });
});

describe("token to pools", () => {
  it("finds a token with multiple pools on either side", async () => {
    const page = await client().find({ token: BONK });
    expect(page.items.map((p) => p.address).sort()).toEqual([poolA, poolB].sort());
    expect(page.total).toBe(2);
  });

  it("finds a token with exactly one pool", async () => {
    const page = await client().find({ token: SOL, pairedWith: USDC });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.address).toBe(poolC);
  });

  it("returns an empty page for a token with no known pools", async () => {
    const page = await client().find({ token: LONELY });
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("filters by paired quote token (SOL vs USDC vs other SPL)", async () => {
    const pools = client();
    expect((await pools.find({ token: BONK, pairedWith: SOL })).items[0]!.address).toBe(poolA);
    expect((await pools.find({ token: BONK, pairedWith: USDC })).items[0]!.address).toBe(poolB);
    expect((await pools.find({ token: BONK, pairedWith: LONELY })).items).toEqual([]);
  });

  it("filters by dex label", async () => {
    const page = await client().find({ token: BONK, dex: "orca" });
    expect(page.items.map((p) => p.address)).toEqual([poolB]);
  });

  it("rejects an invalid mint", async () => {
    await expect(client().find({ token: "not-a-mint" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws when no provider is registered", async () => {
    await expect(new PoolClient().find({ token: BONK })).rejects.toBeInstanceOf(
      UnsupportedOperationError,
    );
  });

  it("merges and deduplicates across multiple providers", async () => {
    const pools = new PoolClient([provider("a"), provider("b")]);
    const page = await pools.find({ token: BONK });
    expect(page.items.map((p) => p.address).sort()).toEqual([poolA, poolB].sort());
    expect(page.source.provider).toBe("a+b");
  });

  it("paginates a single provider with opaque cursors", async () => {
    const pools = client();
    const first = await pools.find({ token: BONK, limit: 1 }, { provider: "static-pools" });
    expect(first.items).toHaveLength(1);
    expect(first.hasMore).toBe(true);
    const second = await pools.find(
      { token: BONK, limit: 1, cursor: first.nextCursor },
      { provider: "static-pools" },
    );
    expect(second.items[0]!.address).not.toBe(first.items[0]!.address);
    expect(second.hasMore).toBe(false);
  });

  it("rejects a cursor it did not issue", async () => {
    await expect(
      client().find({ token: BONK, cursor: "page=2" }, { provider: "static-pools" }),
    ).rejects.toBeInstanceOf(UnsupportedOperationError);
  });
});

describe("pool details", () => {
  it("returns null for an unknown pool address", async () => {
    await expect(client().get(addr(200))).resolves.toBeNull();
  });

  it("rejects an invalid pool address", async () => {
    await expect(client().get("nope!")).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an unknown provider name", async () => {
    await expect(client().get(poolA, { provider: "ghost" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("provider capability detection", () => {
  it("derives capabilities from the data actually present", () => {
    const p = provider();
    expect(p.capabilities.findByToken).toBe(true);
    expect(p.capabilities.reserves).toBe(true);
    expect(p.capabilities.volume).toBe(true);
    expect(p.capabilities.creation).toBe(true);
    expect(p.capabilities.tvl).toBe(false);
  });

  it("reports nothing for a provider with no usable data", () => {
    const empty = new StaticPoolProvider({ pools: [] });
    expect(empty.capabilities.volume).toBe(false);
    expect(empty.capabilities.price).toBe(false);
    expect(empty.capabilities.fee).toBe(false);
  });

  it("unions capabilities across registered providers", () => {
    const pools = new PoolClient([
      new StaticPoolProvider({ name: "no-data", pools: [] }),
      provider("rich"),
    ]);
    expect(pools.supports("volume")).toBe(true);
    expect(pools.supports("volume", "no-data")).toBe(false);
    expect(pools.dexes).toContain("multi");
  });

  it("refuses pair filtering on a provider that cannot do it", async () => {
    const limited: PoolProvider = {
      name: "by-token-only",
      dex: "custom",
      capabilities: poolCapabilities({ findByToken: true }),
      findPools: async () => ({
        items: [],
        nextCursor: null,
        hasMore: false,
        source: { provider: "by-token-only", dex: "custom" },
      }),
      getPool: async () => null,
    };
    const pools = new PoolClient([limited]);
    await expect(
      pools.find({ token: BONK, pairedWith: SOL }, { provider: "by-token-only" }),
    ).rejects.toBeInstanceOf(UnsupportedOperationError);
    await expect(pools.find({ token: BONK, pairedWith: SOL })).rejects.toBeInstanceOf(
      UnsupportedOperationError,
    );
  });
});

describe("provider failure and malformed data", () => {
  const broken: PoolProvider = {
    name: "broken",
    dex: "custom",
    capabilities: poolCapabilities({ findByToken: true, getByAddress: true }),
    findPools: async () => {
      throw new Error("upstream 502");
    },
    getPool: async () => {
      throw new Error("upstream 502");
    },
  };

  const malformed: PoolProvider = {
    name: "malformed",
    dex: "custom",
    capabilities: poolCapabilities({ findByToken: true, getByAddress: true }),
    findPools: async () => ({ pools: [] }) as unknown as PoolPage<LiquidityPool>,
    getPool: async () => ({ nope: true }) as unknown as LiquidityPool,
  };

  it("wraps provider failures as ProviderError", async () => {
    await expect(
      new PoolClient([broken]).find({ token: BONK }, { provider: "broken" }),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(new PoolClient([broken]).get(poolA)).rejects.toBeInstanceOf(ProviderError);
  });

  it("tolerates one failing provider when merging", async () => {
    const pools = new PoolClient([broken, provider("good")]);
    const page = await pools.find({ token: BONK });
    expect(page.items).toHaveLength(2);
  });

  it("can be told not to tolerate failures", async () => {
    const pools = new PoolClient([broken, provider("good")]);
    await expect(
      pools.find({ token: BONK }, { tolerateFailures: false }),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it("rejects a malformed page shape", async () => {
    await expect(
      new PoolClient([malformed]).find({ token: BONK }, { provider: "malformed" }),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it("rejects a malformed pool object", async () => {
    await expect(new PoolClient([malformed]).get(poolA)).rejects.toBeInstanceOf(ProviderError);
  });

  it("drops malformed entries from an otherwise valid page", async () => {
    const mixed: PoolProvider = {
      name: "mixed",
      dex: "custom",
      capabilities: poolCapabilities({ findByToken: true }),
      findPools: async (_query: PoolQuery) => ({
        items: [{ oops: 1 } as unknown as LiquidityPool],
        nextCursor: null,
        hasMore: false,
        source: { provider: "mixed", dex: "custom" },
      }),
      getPool: async () => null,
    };
    const page = await new PoolClient([mixed]).find({ token: BONK });
    expect(page.items).toEqual([]);
  });
});

describe("pool ranking", () => {
  it("ranks deeper liquidity first and reports factors", async () => {
    const page = await client().find({ token: BONK });
    const ranked = rankPools(page.items);
    expect(ranked[0]!.pool.address).toBe(poolA);
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
    expect(ranked[0]!.factors.map((f) => f.name)).toContain("liquidity");
    expect(ranked[0]!.confidence).toBeGreaterThan(0);
  });

  it("honours provider preference and a liquidity floor", async () => {
    const page = await client().find({ token: BONK });
    const preferred = rankPools(page.items, {
      prefer: ["orca"],
      weights: { liquidity: 0, volume: 0, fee: 0, priceImpact: 0, preference: 1 },
    });
    expect(preferred[0]!.pool.dex).toBe("orca");

    const filtered = rankPools(page.items, { minLiquidityUsd: 100_000 });
    expect(filtered.map((r) => r.pool.address)).toEqual([poolA]);
  });

  it("estimates price impact only as a heuristic", async () => {
    const page = await client().find({ token: BONK });
    const ranked = rankPools(page.items, { amountUsd: 10_000 });
    const impact = ranked[0]!.factors.find((f) => f.name === "priceImpact");
    expect(impact?.origin).toBe("derived");
    expect(impact?.detail).toContain("not a quote");
  });

  it("lowers confidence when data is missing", () => {
    const bare: LiquidityPool[] = [
      {
        address: poolB,
        dex: "custom",
        poolType: "unknown",
        programId: null,
        tokenA: { mint: BONK, symbol: null, decimals: null, reserveRaw: null, reserveUi: null, reserveOrigin: null },
        tokenB: { mint: SOL, symbol: null, decimals: null, reserveRaw: null, reserveUi: null, reserveOrigin: null },
        price: null,
        liquidity: { hasReserves: false, indexedUsd: null, tvlUsd: null, estimatedUsd: null },
        volume24hUsd: null,
        fee: { bps: null, origin: null },
        createdAt: null,
        createdSignature: null,
        source: { provider: "custom", dex: "custom", origin: "indexed" },
        raw: null,
      },
    ];
    const ranked = rankPools(bare);
    expect(ranked[0]!.confidence).toBe(0);
    expect(ranked[0]!.factors).toEqual([]);
  });
});

describe("client integration", () => {
  it("exposes pools on SolanaClient with no provider registered", async () => {
    const sdk = new SolanaClient({ provider: new MockRpcProvider() });
    expect(sdk.pools.names).toEqual([]);
    await expect(sdk.pools.find(BONK)).rejects.toBeInstanceOf(UnsupportedOperationError);
    sdk.pools.register(provider());
    const ranked = await sdk.pools.best(BONK);
    expect(ranked[0]!.pool.address).toBe(poolA);
  });

  it("verifies a pool address against chain state", async () => {
    const rpc = new MockRpcProvider();
    rpc.set("getAccountInfo", {
      context: { slot: 1 },
      value: { owner: RAY_PROGRAM, lamports: 100, data: ["", "base64"], executable: false, rentEpoch: 0 },
    });
    const sdk = new SolanaClient({ provider: rpc });
    sdk.pools.register(provider());
    const pool = (await sdk.pools.get(poolA))!;
    const verification = await sdk.pools.verify(pool);
    expect(verification.exists).toBe(true);
    expect(verification.owner).toBe(RAY_PROGRAM);
    expect(verification.programMatches).toBe(true);
  });

  it("reports unknown program match when the provider declared none", async () => {
    const rpc = new MockRpcProvider();
    rpc.set("getAccountInfo", { context: { slot: 1 }, value: null });
    const sdk = new SolanaClient({ provider: rpc });
    sdk.pools.register(provider());
    const pool = (await sdk.pools.get(poolB))!;
    const verification = await sdk.pools.verify(pool);
    expect(verification.exists).toBe(false);
    expect(verification.programMatches).toBeNull();
  });
});
