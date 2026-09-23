import { describe, expect, it } from "vitest";
import { PoolClient } from "../pools/PoolClient.js";
import { StaticPoolProvider } from "../pools/providers/StaticPoolProvider.js";
import { SwapClient, MAINNET_USDC_MINT } from "../swap/SwapClient.js";
import { PoolQuoteProvider } from "../swap/providers/PoolQuoteProvider.js";
import { constantProductQuote, minimumReceived } from "../swap/math.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { ProviderError, ValidationError } from "../errors/index.js";
import { base58Encode } from "../utils/base58.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));
const TOKEN = addr(3);
const THIN = addr(4);

function setup(now = () => 1_000) {
  const pools = new PoolClient([
    new StaticPoolProvider({
      name: "fixture",
      dex: "multi",
      pools: [
        { address: addr(101), dex: "raydium", poolType: "amm", tokenA: { mint: WRAPPED_SOL_MINT, symbol: "SOL", decimals: 9, reserveRaw: "1000000000000" }, tokenB: { mint: TOKEN, symbol: "TKN", decimals: 6, reserveRaw: "100000000000000" }, feeBps: 25 },
        { address: addr(102), dex: "orca", poolType: "cpmm", tokenA: { mint: MAINNET_USDC_MINT, symbol: "USDC", decimals: 6, reserveRaw: "50000000000" }, tokenB: { mint: TOKEN, symbol: "TKN", decimals: 6, reserveRaw: "500000000000" }, feeBps: 30 },
        { address: addr(103), dex: "x", poolType: "amm", tokenA: { mint: WRAPPED_SOL_MINT, symbol: "SOL", decimals: 9, reserveRaw: "0" }, tokenB: { mint: THIN, symbol: "T", decimals: 6, reserveRaw: "0" }, feeBps: 30 },
      ],
    }),
  ]);
  return new SwapClient([new PoolQuoteProvider(pools, { now, ttlMs: 30_000 })], { now });
}

describe("swap quotes", () => {
  it("SOL -> token", async () => {
    const q = await setup().quote({ input: "SOL", output: TOKEN, amount: 1_000_000_000n, slippageBps: 100 });
    const exp = constantProductQuote(1_000_000_000n, 1_000_000_000_000n, 100_000_000_000_000n, 25);
    expect(q.outAmount).toBe(exp.amountOut);
    expect(q.minOutAmount).toBe((exp.amountOut * 9_900n) / 10_000n);
    expect(q.route).toHaveLength(1);
    expect(q.pools).toEqual([addr(101)]);
    expect(q.provider).toBe("pool-cpmm");
  });
  it("token -> SOL", async () => {
    const q = await setup().quote({ input: TOKEN, output: "SOL", amount: 1_000_000n });
    expect(q.outputMint).toBe(WRAPPED_SOL_MINT);
    expect(q.outAmount > 0n).toBe(true);
  });
  it("USDC -> token", async () => {
    const q = await setup().quote({ input: "USDC", output: TOKEN, amount: 100_000_000n });
    expect(q.pools).toEqual([addr(102)]);
    expect(q.fees[0]!.amount).toBe(300_000n);
  });
  it("insufficient liquidity", async () => {
    await expect(setup().quote({ input: "SOL", output: THIN, amount: 1n })).rejects.toBeInstanceOf(ProviderError);
  });
  it("zero amount", async () => {
    await expect(setup().quote({ input: "SOL", output: TOKEN, amount: 0n })).rejects.toBeInstanceOf(ValidationError);
  });
  it("invalid mint", async () => {
    await expect(setup().quote({ input: "SOL", output: "nope", amount: 1n })).rejects.toBeInstanceOf(ValidationError);
  });
  it("excessive slippage", async () => {
    await expect(setup().quote({ input: "SOL", output: TOKEN, amount: 1n, slippageBps: 5_000 })).rejects.toBeInstanceOf(ValidationError);
    await expect(setup().quote({ input: "SOL", output: TOKEN, amount: 1n, slippageBps: 1.5 })).rejects.toBeInstanceOf(ValidationError);
  });
  it("price impact is separate from slippage and grows with size", async () => {
    const s = setup();
    const small = await s.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n, slippageBps: 300 });
    const big = await s.quote({ input: "SOL", output: TOKEN, amount: 100_000_000_000n, slippageBps: 300 });
    expect(small.priceImpactBps).toBe(1);
    expect(big.priceImpactBps).toBe(910);
    expect(big.slippageBps).toBe(300);
    expect(big.spotPrice).toEqual({ numerator: 100_000_000_000_000n, denominator: 1_000_000_000_000n });
  });
  it("fee calculation rounds up in pool's favour", () => {
    expect(constantProductQuote(1n, 1000n, 1000n, 30).feeAmount).toBe(1n);
    expect(constantProductQuote(10_000n, 10n ** 9n, 10n ** 9n, 30).feeAmount).toBe(30n);
  });
  it("integer precision for huge amounts", () => {
    const big = 10n ** 30n;
    const r = constantProductQuote(big, big, big * 2n, 0);
    expect(r.amountOut).toBe(big);
    expect(minimumReceived(123_456_789_012_345_678_901n, 1)).toBe(123_444_443_333_444_444_333n);
  });
  it("expired quotes", async () => {
    let t = 1_000;
    const s = setup(() => t);
    const q = await s.quote({ input: "SOL", output: TOKEN, amount: 1n * 10n ** 9n });
    expect(s.isExpired(q)).toBe(false);
    t += 30_000;
    expect(s.isExpired(q)).toBe(true);
    expect(() => s.assertFresh(q)).toThrow(ValidationError);
  });
});
