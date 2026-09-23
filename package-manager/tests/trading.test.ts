import { describe, expect, it } from "vitest";
import { createDemoTradingEnv, DEMO_SWAP_PROGRAM } from "./tradingFixtures.js";
import { MAINNET_USDC_MINT } from "../swap/SwapClient.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { UnsupportedOperationError, ValidationError } from "../errors/index.js";
const decodeU64LE = (d: Uint8Array, o: number): bigint => new DataView(d.buffer, d.byteOffset).getBigUint64(o, true);

describe("Phase 7 trading integration", () => {
  it("discover → get token → find pools → quote → build → simulate", async () => {
    const { sdk, wallet, mints } = createDemoTradingEnv();

    const page = await sdk.trading.discover("new", { limit: 5 });
    expect(page.items[0]!.mint).toBe(mints.BAY); // newest createdAt first
    expect(page.source.provider).toBe("demo-list");

    const token = await sdk.tokens.get(mints.PHX);
    expect(token.mint.decimals).toBe(6);

    const pools = await sdk.pools.find({ token: mints.PHX });
    expect(pools.items).toHaveLength(3);

    const quote = await sdk.swap.quote({ input: "SOL", output: mints.PHX, amount: 1_000_000_000n, slippageBps: 100 });
    expect(quote.provider).toBe("demo-amm");
    expect(quote.minOutAmount).toBeLessThan(quote.outAmount);

    const built = await sdk.swap.build({ quote, owner: wallet.address });
    expect(built.requiredSigners).toEqual([wallet.address]);

    const sim = await sdk.swap.simulate(built);
    expect(sim.success).toBe(true);
    expect(sim.unitsConsumed).toBe(48_210);

    const res = await sdk.swap.execute(built, { signers: [wallet], pollIntervalMs: 1 });
    expect(res.confirmationStatus).toBe("confirmed");
  });

  it("builds a token view that keeps sources separate", async () => {
    const { sdk, mints } = createDemoTradingEnv();
    const view = await sdk.trading.view(mints.PHX);
    expect(view.decimals.source.origin).toBe("mint");
    expect(view.symbol).toEqual({ value: "PHX", source: { origin: "discovery", provider: "demo-list" } });
    expect(view.market?.source.provider).toBe("demo-list");
    expect(view.market?.data.price).toBe(0.0123);
    expect(view.layers.metadata.value?.onChain).toBeNull();
    expect(view.pools.map((p) => p.pair).sort()).toEqual(["PHX/BAY", "PHX/SOL", "PHX/USDC"]);
    expect(view.pools.find((p) => p.pair === "PHX/BAY")!.liquidityUsd?.kind).toBe("tvl");
    expect(view.routes.map((r) => r.pairedSymbol).sort()).toEqual(["BAY", "SOL", "USDC"]);
    expect(view.layers.pools.provider).toBe("demo-pools");
  });

  it("refuses discovery categories the provider does not support", async () => {
    const { sdk } = createDemoTradingEnv();
    expect(sdk.trading.categories()).toEqual(["search", "new", "recent", "volume"]);
    await expect(sdk.trading.discover("trending")).rejects.toThrow(UnsupportedOperationError);
    await expect(sdk.trading.discover("search")).rejects.toThrow(ValidationError);
    const hits = await sdk.trading.discover("search", { query: "bay" });
    expect(hits.items.map((t) => t.symbol)).toContain("BAY");
    const vol = await sdk.trading.discover("volume");
    expect(vol.items[0]!.symbol).toBe("PHX");
  });

  it("sells token → SOL, token → USDC and token → token", async () => {
    const { sdk, wallet, mints } = createDemoTradingEnv();
    const toSol = await sdk.trading.quoteSell({ mint: mints.PHX, amount: 1_000_000_000n });
    expect(toSol.outputMint).toBe(WRAPPED_SOL_MINT);
    const toUsdc = await sdk.trading.quoteSell({ mint: mints.PHX, receive: "USDC", amount: 1_000_000_000n });
    expect(toUsdc.outputMint).toBe(MAINNET_USDC_MINT);
    const toBay = await sdk.trading.quoteSell({ mint: mints.PHX, receive: mints.BAY, amount: 1_000_000_000n });
    expect(toBay.outputMint).toBe(mints.BAY);

    for (const q of [toSol, toUsdc, toBay]) {
      const built = await sdk.swap.build({ quote: q, owner: wallet.address });
      const swapIx = built.instructions.find((ix) => ix.programId === DEMO_SWAP_PROGRAM)!;
      expect(decodeU64LE(swapIx.data, 9)).toBe(q.minOutAmount);
      expect((await sdk.swap.simulate(built)).success).toBe(true);
    }
    await expect(sdk.trading.quoteSell({ mint: mints.ISL, amount: 1n })).rejects.toThrow(/No route/);
  });

  it("exposes provider transparency for quotes and built transactions", async () => {
    const { sdk, wallet, mints } = createDemoTradingEnv();
    const quote = await sdk.trading.quoteBuy({ mint: mints.PHX, amount: 500_000_000n });
    const qTrace = await sdk.trading.trace(quote);
    expect(qTrace.swapProvider).toBe("demo-amm");
    expect(qTrace.hops[0]).toMatchObject({ dex: "demo-amm", poolProgramId: DEMO_SWAP_PROGRAM, poolProvider: "demo-pools" });
    expect(qTrace.executingPrograms).toBeNull();

    const built = await sdk.swap.build({ quote, owner: wallet.address });
    const bTrace = await sdk.trading.trace(built);
    expect(bTrace.swapPrograms).toEqual([DEMO_SWAP_PROGRAM]);
    expect(bTrace.executingPrograms).toContain(DEMO_SWAP_PROGRAM);
  });
});
