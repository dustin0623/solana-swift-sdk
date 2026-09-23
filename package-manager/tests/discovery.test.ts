import { describe, expect, it } from "vitest";
import { SolanaClient } from "../core/SolanaClient.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { TokenDiscoveryClient } from "../discovery/TokenDiscoveryClient.js";
import { StaticTokenListProvider } from "../discovery/providers/StaticTokenListProvider.js";
import {
  capabilities,
  type DiscoveredToken,
  type DiscoveryListQuery,
  type DiscoveryPage,
  type DiscoverySearchQuery,
  type TokenDiscoveryProvider,
} from "../discovery/types.js";
import { ProviderError, UnsupportedOperationError, ValidationError } from "../errors/index.js";
import { base58Encode } from "../utils/base58.js";
import { TOKEN_PROGRAM_ID } from "../utils/address.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));
const bonk = addr(21);
const wif = addr(22);
const other = addr(23);

function list(count: number): StaticTokenListProvider {
  return new StaticTokenListProvider({
    name: "list",
    attribution: "test fixture",
    entries: Array.from({ length: count }, (_, i) => ({
      mint: addr(40 + i),
      symbol: `T${i}`,
      name: `Token ${i}`,
      decimals: 6,
    })),
  });
}

const market = new StaticTokenListProvider({
  name: "market",
  attribution: "fake market api",
  entries: [
    {
      mint: bonk,
      symbol: "BONK",
      name: "Bonk",
      decimals: 5,
      createdAt: "2023-01-01T00:00:00.000Z",
      verification: "verified",
      market: { currency: "USD", price: 0.00002, volume24h: 5_000_000, liquidity: 2_000_000 },
    },
    {
      mint: wif,
      symbol: "WIF",
      name: "dogwifhat",
      decimals: 6,
      createdAt: "2024-01-01T00:00:00.000Z",
      market: { currency: "USD", price: 2.5, volume24h: 9_000_000, liquidity: 1_000_000 },
    },
  ],
});

describe("discovery: search", () => {
  it("finds tokens by symbol and name, case-insensitively", async () => {
    const client = new TokenDiscoveryClient([market]);
    const bySymbol = await client.search("bonk");
    expect(bySymbol.items.map((t) => t.symbol)).toEqual(["BONK"]);

    const byName = await client.search("dogwif");
    expect(byName.items.map((t) => t.mint)).toEqual([wif]);
  });

  it("finds a token by exact mint address", async () => {
    const client = new TokenDiscoveryClient([market]);
    const page = await client.search({ query: bonk, match: ["mint"] });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.mint).toBe(bonk);
  });

  it("rejects an empty query", async () => {
    const client = new TokenDiscoveryClient([market]);
    await expect(client.search("   ")).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns an empty page when nothing matches", async () => {
    const client = new TokenDiscoveryClient([market]);
    const page = await client.search("nothing-here");
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(page.total).toBe(0);
  });
});

describe("discovery: pagination", () => {
  it("walks cursor pages without overlap", async () => {
    const client = new TokenDiscoveryClient([list(5)]);
    const first = await client.list({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.hasMore).toBe(true);

    const second = await client.list({ limit: 2, cursor: first.nextCursor });
    expect(second.items).toHaveLength(2);
    expect(second.items[0]?.mint).not.toBe(first.items[0]?.mint);

    const third = await client.list({ limit: 2, cursor: second.nextCursor });
    expect(third.items).toHaveLength(1);
    expect(third.hasMore).toBe(false);
    expect(third.nextCursor).toBeNull();
  });

  it("iterates every page through paginate()", async () => {
    const client = new TokenDiscoveryClient([list(5)]);
    const seen: string[] = [];
    for await (const page of client.paginate("list", { limit: 2 })) {
      seen.push(...page.map((t) => t.mint));
    }
    expect(new Set(seen).size).toBe(5);
  });

  it("rejects a cursor the provider never issued", async () => {
    const client = new TokenDiscoveryClient([list(3)]);
    await expect(client.list({ cursor: "someone-elses-cursor" })).rejects.toBeInstanceOf(
      UnsupportedOperationError,
    );
  });
});

describe("discovery: capabilities", () => {
  it("derives capabilities and sorts from the data actually present", () => {
    expect(market.capabilities.volume).toBe(true);
    expect(market.capabilities.liquidity).toBe(true);
    expect(market.capabilities.trending).toBe(false);
    expect(market.sorts).toContain("volume");
    expect(market.sorts).not.toContain("trending");

    const plain = list(2);
    expect(plain.capabilities.volume).toBe(false);
    expect(plain.sorts).toEqual([]);
  });

  it("refuses a sort the provider cannot support", async () => {
    const client = new TokenDiscoveryClient([market]);
    await expect(client.list({ sort: "trending" })).rejects.toBeInstanceOf(
      UnsupportedOperationError,
    );
  });

  it("sorts by volume and by newest when supported", async () => {
    const client = new TokenDiscoveryClient([market]);
    const byVolume = await client.list({ sort: "volume" });
    expect(byVolume.items[0]?.symbol).toBe("WIF");
    const byNew = await client.list({ sort: "new" });
    expect(byNew.items[0]?.symbol).toBe("WIF");
  });

  it("throws when no provider is registered", async () => {
    const client = new TokenDiscoveryClient();
    await expect(client.search("bonk")).rejects.toBeInstanceOf(UnsupportedOperationError);
  });

  it("rejects an unknown named provider", async () => {
    const client = new TokenDiscoveryClient([market]);
    await expect(client.search("bonk", { provider: "nope" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("discovery: provider failures", () => {
  const broken: TokenDiscoveryProvider = {
    name: "broken",
    capabilities: capabilities({ search: true, searchByMint: true }),
    sorts: ["volume"],
    async search(): Promise<DiscoveryPage<DiscoveredToken>> {
      throw new Error("upstream 503");
    },
    async list(_q: DiscoveryListQuery): Promise<DiscoveryPage<DiscoveredToken>> {
      return { items: "not-an-array" } as unknown as DiscoveryPage<DiscoveredToken>;
    },
    async get(): Promise<DiscoveredToken | null> {
      return null;
    },
  };

  it("wraps an upstream failure as ProviderError", async () => {
    const client = new TokenDiscoveryClient([broken]);
    await expect(client.search("bonk")).rejects.toBeInstanceOf(ProviderError);
  });

  it("rejects a malformed provider response", async () => {
    const client = new TokenDiscoveryClient([broken]);
    await expect(client.list({})).rejects.toBeInstanceOf(ProviderError);
  });

  it("reports unsupported search on a provider that cannot search", async () => {
    const noSearch: TokenDiscoveryProvider = {
      ...broken,
      name: "no-search",
      capabilities: capabilities({}),
      async search(_q: DiscoverySearchQuery) {
        throw new Error("never called");
      },
    };
    const client = new TokenDiscoveryClient([noSearch]);
    await expect(client.search("bonk")).rejects.toBeInstanceOf(UnsupportedOperationError);
  });
});

describe("discovery: normalization and attribution", () => {
  it("normalizes results and marks the data source", async () => {
    const client = new TokenDiscoveryClient([market]);
    const page = await client.search("bonk");
    const token = page.items[0]!;
    expect(token).toMatchObject({
      mint: bonk,
      symbol: "BONK",
      name: "Bonk",
      decimals: 5,
      verification: "verified",
    });
    expect(token.source).toEqual({
      provider: "market",
      origin: "indexed",
      attribution: "fake market api",
    });
    expect(token.market?.currency).toBe("USD");
    expect(page.source.origin).toBe("indexed");
  });

  it("returns null market data when a provider supplies none", async () => {
    const client = new TokenDiscoveryClient([list(1)]);
    const page = await client.list({});
    expect(page.items[0]?.market).toBeNull();
    expect(page.items[0]?.createdAt).toBeNull();
  });
});

describe("discovery: on-chain mint lookup", () => {
  function clientWithMint(): SolanaClient {
    const provider = new MockRpcProvider();
    provider.on("getAccountInfo", (params) => {
      const [address, config] = params as [string, { encoding?: string } | undefined];
      if (config?.encoding === "jsonParsed" && address === other) {
        return {
          context: { slot: 1 },
          value: {
            lamports: 1461600,
            owner: TOKEN_PROGRAM_ID,
            executable: false,
            rentEpoch: 0,
            data: {
              program: "spl-token",
              space: 82,
              parsed: {
                type: "mint",
                info: { decimals: 6, supply: "1000000", isInitialized: true, mintAuthority: null, freezeAuthority: null },
              },
            },
          },
        };
      }
      return { context: { slot: 1 }, value: null };
    });
    return new SolanaClient({ network: "devnet", provider });
  }

  it("resolves a mint address with no indexer registered", async () => {
    const solana = clientWithMint();
    const token = await solana.tokens.discovery.get(other);
    expect(token?.mint).toBe(other);
    expect(token?.decimals).toBe(6);
    expect(token?.program).toBe("spl-token");
    expect(token?.source).toEqual({ provider: "rpc", origin: "on-chain" });
    expect(token?.market).toBeNull();
  });

  it("searches by mint through the default on-chain provider", async () => {
    const solana = clientWithMint();
    const page = await solana.tokens.search(other);
    expect(page.items).toHaveLength(1);
    expect(page.source.origin).toBe("on-chain");
  });

  it("returns null for a mint that does not exist", async () => {
    const solana = clientWithMint();
    expect(await solana.tokens.discovery.get(addr(99))).toBeNull();
  });

  it("rejects an invalid mint address", async () => {
    const solana = clientWithMint();
    await expect(solana.tokens.discovery.get("not-a-mint")).rejects.toBeInstanceOf(ValidationError);
  });

  it("cannot list from RPC alone, but can once an indexer is registered", async () => {
    const solana = clientWithMint();
    expect(solana.tokens.discovery.sorts()).toEqual([]);
    await expect(solana.tokens.list({})).rejects.toBeInstanceOf(UnsupportedOperationError);

    solana.tokens.discovery.register(market, { default: true });
    const page = await solana.tokens.list({ sort: "volume" });
    expect(page.items[0]?.symbol).toBe("WIF");
    expect(solana.tokens.discovery.names).toEqual(["rpc", "market"]);
  });

  it("still resolves a mint on-chain when an indexer is the default", async () => {
    const solana = clientWithMint();
    solana.tokens.discovery.register(market, { default: true });
    const token = await solana.tokens.discovery.get(other);
    expect(token?.source.provider).toBe("rpc");
  });
});
