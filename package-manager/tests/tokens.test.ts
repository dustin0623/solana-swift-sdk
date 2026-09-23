import { describe, expect, it } from "vitest";
import { SolanaClient } from "../core/SolanaClient.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { ValidationError } from "../errors/index.js";
import { NATIVE_SOL, WRAPPED_SOL_MINT } from "../types/token.js";
import { exactAmount, lamportsAmount, parseTokenAmount } from "../utils/tokenAmount.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, addressToBytes } from "../utils/address.js";
import { base58Encode } from "../utils/base58.js";
import { base64Encode, concatBytes, encodeU32LE } from "../utils/bytes.js";
import { fetchOffChainMetadata } from "../reader/metadata/OffChainMetadata.js";
import { isValidAddress } from "../utils/address.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));
const owner = addr(1);
const mint = addr(4);
const mint22 = addr(9);
const ata1 = addr(10);
const ata2 = addr(11);
const ata22 = addr(12);

function mintAccount(programId: string, info: Record<string, unknown>): unknown {
  return {
    context: { slot: 10 },
    value: {
      lamports: 1461600,
      owner: programId,
      executable: false,
      rentEpoch: 0,
      data: { program: "spl-token", parsed: { type: "mint", info }, space: 82 },
    },
  };
}

function tokenAccount(pubkey: string, programId: string, mintAddr: string, amount: string, decimals: number, extra: Record<string, unknown> = {}): unknown {
  return {
    pubkey,
    account: {
      lamports: 2039280,
      owner: programId,
      executable: false,
      rentEpoch: 0,
      data: {
        program: "spl-token",
        parsed: {
          type: "account",
          info: { mint: mintAddr, owner, state: "initialized", isNative: false, tokenAmount: { amount, decimals }, ...extra },
        },
      },
    },
  };
}

const classicMint = mintAccount(TOKEN_PROGRAM_ID, {
  decimals: 6,
  supply: "1000000000000",
  mintAuthority: owner,
  freezeAuthority: null,
  isInitialized: true,
});

function str(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  return concatBytes(encodeU32LE(bytes.length), bytes);
}

function metaplexAccount(forMint: string, uri = "https://example.com/meta.json"): unknown {
  const data = concatBytes(
    Uint8Array.of(4),
    addressToBytes(owner),
    addressToBytes(forMint),
    str("Example Token\0\0\0"),
    str("EXT\0"),
    str(uri),
    Uint8Array.of(0xf4, 0x01), // 500 bps
    Uint8Array.of(1),
    encodeU32LE(1),
    addressToBytes(owner),
    Uint8Array.of(1, 100),
    Uint8Array.of(0, 1),
  );
  return {
    context: { slot: 10 },
    value: { lamports: 1, owner: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", executable: false, rentEpoch: 0, data: [base64Encode(data), "base64"] },
  };
}

/** getAccountInfo is used for both the mint (jsonParsed) and the metadata PDA (base64). */
function accountRouter(mintValue: unknown, metadataValue: unknown) {
  return (params: readonly unknown[]): unknown => {
    const cfg = params[1] as { encoding?: string } | undefined;
    return cfg?.encoding === "jsonParsed" ? mintValue : metadataValue;
  };
}

function client(fixtures: Record<string, unknown>): SolanaClient {
  const provider = new MockRpcProvider();
  for (const [method, value] of Object.entries(fixtures)) provider.set(method, value);
  return new SolanaClient({ provider });
}

describe("tokens.get", () => {
  it("reads a valid classic SPL mint", async () => {
    const sdk = client({ getAccountInfo: classicMint });
    const token = await sdk.tokens.get(mint);
    expect(token.asset).toEqual({ kind: "spl", program: "spl-token", mint });
    expect(token.mint.decimals).toBe(6);
    expect(token.mint.supply.raw).toBe(1_000_000_000_000n);
    expect(token.mint.supply.ui).toBe("1000000");
    expect(token.mint.extensions).toEqual([]);
  });

  it("rejects a missing account, a non-token owner and a non-mint token account", async () => {
    await expect(client({ getAccountInfo: { context: { slot: 1 }, value: null } }).tokens.get(mint)).rejects.toThrow(ValidationError);
    await expect(
      client({ getAccountInfo: mintAccount("11111111111111111111111111111111", { decimals: 6 }) }).tokens.get(mint),
    ).rejects.toThrow(/not owned/);
    const notMint = { context: { slot: 1 }, value: (tokenAccount(ata1, TOKEN_PROGRAM_ID, mint, "1", 6) as { account: unknown }).account };
    await expect(client({ getAccountInfo: notMint }).tokens.get(mint)).rejects.toThrow(/not a mint/);
    await expect(client({}).tokens.get("not-an-address")).rejects.toThrow(ValidationError);
  });

  it("reads Token-2022 mints and keeps extensions uninterpreted", async () => {
    const sdk = client({
      getAccountInfo: mintAccount(TOKEN_2022_PROGRAM_ID, {
        decimals: 9,
        supply: "5",
        isInitialized: true,
        extensions: [{ extension: "transferFeeConfig", state: { transferFeeBasisPoints: 50 } }],
      }),
    });
    const token = await sdk.tokens.get(mint22);
    expect(token.mint.program).toBe("spl-token-2022");
    expect(token.mint.programId).toBe(TOKEN_2022_PROGRAM_ID);
    expect(token.mint.extensions[0]?.extension).toBe("transferFeeConfig");
  });
});

describe("tokens.supply", () => {
  it("returns exact supply beyond Number.MAX_SAFE_INTEGER", async () => {
    const sdk = client({
      getTokenSupply: { context: { slot: 77 }, value: { amount: "18446744073709551615", decimals: 9, uiAmount: 1.8e10 } },
    });
    const supply = await sdk.tokens.supply(mint);
    expect(supply.amount.raw).toBe(18446744073709551615n);
    expect(supply.amount.ui).toBe("18446744073.709551615");
    expect(supply.slot).toBe(77);
  });
});

describe("tokens.accounts", () => {
  it("scans SPL Token and Token-2022 and normalizes results", async () => {
    const provider = new MockRpcProvider();
    provider.set("getTokenAccountsByOwner", (params: readonly unknown[]) => {
      const filter = params[1] as { programId?: string };
      return {
        context: { slot: 1 },
        value:
          filter.programId === TOKEN_2022_PROGRAM_ID
            ? [tokenAccount(ata22, TOKEN_2022_PROGRAM_ID, mint22, "7", 0)]
            : [tokenAccount(ata1, TOKEN_PROGRAM_ID, mint, "1500000", 6), tokenAccount(ata2, TOKEN_PROGRAM_ID, mint, "0", 6)],
      };
    });
    const sdk = new SolanaClient({ provider });
    const accounts = await sdk.tokens.accounts({ owner });
    expect(accounts.map((a) => a.address)).toEqual([ata1, ata2, ata22]);
    expect(accounts[0]?.amount).toEqual({ raw: 1_500_000n, decimals: 6, ui: "1.5" });
    expect(accounts[2]?.program).toBe("spl-token-2022");
    expect(provider.calls.filter((c) => c.method === "getTokenAccountsByOwner")).toHaveLength(2);

    const nonZero = await sdk.tokens.accounts({ owner, nonZero: true });
    expect(nonZero.map((a) => a.address)).toEqual([ata1, ata22]);
  });

  it("returns an empty list for a wallet with no token accounts", async () => {
    const sdk = client({ getTokenAccountsByOwner: { context: { slot: 1 }, value: [] } });
    expect(await sdk.tokens.accounts({ owner })).toEqual([]);
  });
});

describe("tokens.balance", () => {
  it("sums multiple token accounts for one mint", async () => {
    const sdk = client({
      getAccountInfo: classicMint,
      getTokenAccountsByOwner: {
        context: { slot: 1 },
        value: [tokenAccount(ata1, TOKEN_PROGRAM_ID, mint, "1000000", 6), tokenAccount(ata2, TOKEN_PROGRAM_ID, mint, "250000", 6)],
      },
    });
    const balance = await sdk.tokens.balance({ owner, mint });
    expect(balance.amount).toEqual({ raw: 1_250_000n, decimals: 6, ui: "1.25" });
    expect(balance.accounts).toEqual([ata1, ata2]);
  });

  it("returns zero with correct decimals when the owner has no account", async () => {
    const sdk = client({ getAccountInfo: classicMint, getTokenAccountsByOwner: { context: { slot: 1 }, value: [] } });
    const balance = await sdk.tokens.balance({ owner, mint });
    expect(balance.amount).toEqual({ raw: 0n, decimals: 6, ui: "0" });
  });

  it("handles native SOL separately from wrapped SOL", async () => {
    const sdk = client({ getBalance: { context: { slot: 1 }, value: 2_500_000_000 } });
    const balance = await sdk.tokens.balance({ owner, mint: NATIVE_SOL });
    expect(balance.asset).toEqual({ kind: "native", symbol: "SOL", decimals: 9 });
    expect(balance.amount.ui).toBe("2.5");
    expect(isValidAddress(NATIVE_SOL)).toBe(false);
    expect(isValidAddress(WRAPPED_SOL_MINT)).toBe(true);
  });
});

describe("tokens.metadata", () => {
  it("decodes Metaplex on-chain metadata and skips off-chain by default", async () => {
    const sdk = client({ getAccountInfo: accountRouter(classicMint, metaplexAccount(mint)) });
    const meta = await sdk.tokens.metadata(mint);
    expect(meta.onChain?.source).toBe("metaplex");
    expect(meta.onChain?.name).toBe("Example Token");
    expect(meta.onChain?.symbol).toBe("EXT");
    expect(meta.onChain?.sellerFeeBasisPoints).toBe(500);
    expect(meta.onChain?.creators).toEqual([{ address: owner, verified: true, share: 100 }]);
    expect(meta.onChain?.isMutable).toBe(true);
    expect(meta.offChain.status).toBe("skipped");
    expect(meta.decimals).toBe(6);
  });

  it("reports unavailable metadata without throwing", async () => {
    const sdk = client({ getAccountInfo: accountRouter(classicMint, { context: { slot: 1 }, value: null }) });
    const meta = await sdk.tokens.metadata(mint, { offChain: true });
    expect(meta.onChain).toBeNull();
    expect(meta.offChain.status).toBe("unavailable");
    expect(meta.warnings).toContain("No on-chain metadata found");
  });

  it("reports malformed on-chain metadata as a warning", async () => {
    const garbage = { context: { slot: 1 }, value: { lamports: 1, owner: "x", executable: false, rentEpoch: 0, data: [base64Encode(Uint8Array.of(4, 1, 2)), "base64"] } };
    const sdk = client({ getAccountInfo: accountRouter(classicMint, garbage) });
    const meta = await sdk.tokens.metadata(mint);
    expect(meta.onChain).toBeNull();
    expect(meta.warnings.some((w) => w.includes("unreadable"))).toBe(true);
  });

  it("rejects metadata whose mint field does not match", async () => {
    const sdk = client({ getAccountInfo: accountRouter(classicMint, metaplexAccount(addr(5))) });
    const meta = await sdk.tokens.metadata(mint);
    expect(meta.onChain).toBeNull();
  });

  it("reads the Token-2022 metadata extension", async () => {
    const sdk = client({
      getAccountInfo: mintAccount(TOKEN_2022_PROGRAM_ID, {
        decimals: 6,
        supply: "100",
        extensions: [
          { extension: "metadataPointer", state: { metadataAddress: mint22 } },
          { extension: "tokenMetadata", state: { name: "T22", symbol: "TT", uri: "ipfs://abc", updateAuthority: owner, additionalMetadata: [["site", "x"]] } },
        ],
      }),
    });
    const meta = await sdk.tokens.metadata(mint22);
    expect(meta.onChain?.source).toBe("token-2022");
    expect(meta.onChain?.additionalMetadata).toEqual([["site", "x"]]);
  });

  it("fetches and validates off-chain JSON through an injected fetch", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          name: "Example",
          image: "javascript:alert(1)",
          description: 42,
          external_url: "https://example.com",
          extensions: { website: "https://example.com", bad: "file:///etc/passwd" },
        }),
      )) as typeof fetch;
    const sdk = client({ getAccountInfo: accountRouter(classicMint, metaplexAccount(mint)) });
    const meta = await sdk.tokens.metadata(mint, { offChain: { fetch: fetchImpl } });
    expect(meta.offChain.status).toBe("ok");
    expect(meta.offChain.name).toBe("Example");
    expect(meta.offChain.image).toBeUndefined();
    expect(meta.offChain.description).toBeUndefined();
    expect(meta.offChain.links).toEqual([{ label: "website", url: "https://example.com/" }]);
  });

  it("handles unreachable, non-JSON and unsupported off-chain URIs", async () => {
    const failing = (async () => {
      throw new TypeError("network down");
    }) as typeof fetch;
    expect((await fetchOffChainMetadata("https://x.test/a.json", { fetch: failing })).status).toBe("unavailable");
    const html = (async () => new Response("<html>")) as typeof fetch;
    expect((await fetchOffChainMetadata("https://x.test/a.json", { fetch: html })).status).toBe("invalid");
    expect((await fetchOffChainMetadata("file:///etc/passwd")).status).toBe("invalid");
    const notFound = (async () => new Response("", { status: 404 })) as typeof fetch;
    expect((await fetchOffChainMetadata("ipfs://cid", { fetch: notFound })).error).toBe("HTTP 404");
  });
});

describe("exact amounts", () => {
  it("converts between raw and human-readable values without floats", () => {
    expect(parseTokenAmount("0.000001", 6).raw).toBe(1n);
    expect(exactAmount("123456789012345678901234567890", 18).ui).toBe("123456789012.34567890123456789");
    expect(lamportsAmount(1n).ui).toBe("0.000000001");
    expect(() => exactAmount("1.5", 6)).toThrow(ValidationError);
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow();
  });
});
