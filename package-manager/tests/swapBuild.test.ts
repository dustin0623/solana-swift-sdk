import { describe, expect, it } from "vitest";
import { BuilderClient } from "../builder/BuilderClient.js";
import { InstructionBuilder } from "../builder/InstructionBuilder.js";
import type { Instruction } from "../builder/types.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { PoolClient } from "../pools/PoolClient.js";
import { StaticPoolProvider } from "../pools/providers/StaticPoolProvider.js";
import { SwapClient } from "../swap/SwapClient.js";
import { PoolQuoteProvider } from "../swap/providers/PoolQuoteProvider.js";
import type { ResolvedQuoteRequest, SwapInstructionContext, SwapProvider, SwapQuote } from "../swap/types.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { TOKEN_PROGRAM_ID } from "../utils/address.js";
import { encodeU64LE } from "../utils/bytes.js";
import { base58Encode } from "../utils/base58.js";
import { UnsupportedOperationError, ValidationError } from "../errors/index.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));
const TOKEN = addr(3);
const TOKEN2 = addr(5);
const OWNER = addr(7);
const SWAP_PROGRAM = addr(9);
const BLOCKHASH = addr(11);

const pools = new PoolClient([
  new StaticPoolProvider({
    name: "fixture",
    dex: "mock",
    pools: [
      { address: addr(101), dex: "mock", poolType: "amm", tokenA: { mint: WRAPPED_SOL_MINT, symbol: "SOL", decimals: 9, reserveRaw: "1000000000000" }, tokenB: { mint: TOKEN, symbol: "T", decimals: 6, reserveRaw: "100000000000000" }, feeBps: 25 },
      { address: addr(102), dex: "mock", poolType: "amm", tokenA: { mint: TOKEN, symbol: "T", decimals: 6, reserveRaw: "100000000000000" }, tokenB: { mint: TOKEN2, symbol: "T2", decimals: 6, reserveRaw: "50000000000000" }, feeBps: 30 },
    ],
  }),
]);

/** Test-only protocol: data = [1, amountIn u64, minOut u64]. */
class MockSwapProvider implements SwapProvider {
  readonly name = "mock-swap";
  readonly enforcesMinOut: boolean;
  private readonly inner = new PoolQuoteProvider(pools, { name: "mock-swap" });
  public lastContext: SwapInstructionContext | null = null;
  constructor(enforces = true) { this.enforcesMinOut = enforces; }
  quote(r: ResolvedQuoteRequest): Promise<SwapQuote | null> { return this.inner.quote(r); }
  async buildSwapInstructions(ctx: SwapInstructionContext): Promise<Instruction[]> {
    this.lastContext = ctx;
    const data = new Uint8Array(17);
    data[0] = 1;
    data.set(encodeU64LE(ctx.quote.inAmount), 1);
    data.set(encodeU64LE(ctx.minOutAmount), 9);
    return [{
      programId: SWAP_PROGRAM,
      keys: [
        { address: ctx.owner, isSigner: true, isWritable: false },
        { address: ctx.sourceAccount, isSigner: false, isWritable: true },
        { address: ctx.destinationAccount, isSigner: false, isWritable: true },
        { address: ctx.quote.pools[0]!, isSigner: false, isWritable: true },
      ],
      data,
    }];
  }
}

const mint = { owner: TOKEN_PROGRAM_ID, lamports: 1, data: ["", "base64"], executable: false, rentEpoch: 0 };

function setup(opts: { existing?: string[]; tokenBalance?: string; sol?: number; provider?: SwapProvider } = {}) {
  const existing = new Set(opts.existing ?? []);
  const rpcProvider = new MockRpcProvider({
    getAccountInfo: (params: unknown[]) => {
      const a = params[0] as string;
      const isMint = [TOKEN, TOKEN2, WRAPPED_SOL_MINT].includes(a);
      return { context: { slot: 1 }, value: isMint || existing.has(a) ? mint : null };
    },
    getTokenAccountBalance: { context: { slot: 1 }, value: { amount: opts.tokenBalance ?? "0", decimals: 6, uiAmount: 0, uiAmountString: "0" } },
    getBalance: { context: { slot: 1 }, value: opts.sol ?? 10_000_000_000 },
    getMinimumBalanceForRentExemption: 2_039_280,
  });
  const rpc = new RpcClient({ provider: rpcProvider });
  const provider = opts.provider ?? new MockSwapProvider();
  const swap = new SwapClient([provider], { rpc, builder: new BuilderClient(rpc) });
  return { swap, provider };
}

const ata = (owner: string, m: string) => InstructionBuilder.associatedTokenAddress(owner, m);

describe("swap.build", () => {
  it("SOL -> token: wraps SOL, creates missing ATAs, unsigned", async () => {
    const { swap } = setup();
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000_000n, slippageBps: 100 });
    const r = await swap.build({ quote, owner: OWNER, recentBlockhash: BLOCKHASH });
    expect(r.accounts.created).toEqual([ata(OWNER, WRAPPED_SOL_MINT), ata(OWNER, TOKEN)]);
    expect(r.estimatedFees.rentLamports).toBe(2n * 2_039_280n);
    expect(r.estimatedFees.wrappedSolLamports).toBe(1_000_000_000n);
    expect(r.estimatedFees.totalSolRequired).toBe(5_000n + 2n * 2_039_280n + 1_000_000_000n);
    expect(r.transaction.isFullySigned()).toBe(false);
    expect(r.transaction.signatures.size).toBe(0);
    // close temp wSOL at the end
    expect(r.instructions.at(-1)!.data[0]).toBe(9);
  });

  it("token -> SOL unwraps into owner", async () => {
    const { swap } = setup({ existing: [ata(OWNER, TOKEN)], tokenBalance: "5000000" });
    const quote = await swap.quote({ input: TOKEN, output: "SOL", amount: 1_000_000n });
    const r = await swap.build({ quote, owner: OWNER, recentBlockhash: BLOCKHASH });
    expect(r.accounts.created).toEqual([ata(OWNER, WRAPPED_SOL_MINT)]);
    expect(r.instructions.at(-1)!.data[0]).toBe(9);
  });

  it("token -> token", async () => {
    const { swap } = setup({ existing: [ata(OWNER, TOKEN), ata(OWNER, TOKEN2)], tokenBalance: "5000000" });
    const quote = await swap.quote({ input: TOKEN, output: TOKEN2, amount: 1_000_000n });
    const r = await swap.build({ quote, owner: OWNER, recentBlockhash: BLOCKHASH });
    expect(r.accounts.created).toEqual([]);
    expect(r.instructions).toHaveLength(1);
    expect(r.estimatedFees.rentLamports).toBe(0n);
  });

  it("existing output ATA is not recreated", async () => {
    const { swap } = setup({ existing: [ata(OWNER, TOKEN)] });
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    const r = await swap.build({ quote, owner: OWNER, recentBlockhash: BLOCKHASH });
    expect(r.accounts.created).toEqual([ata(OWNER, WRAPPED_SOL_MINT)]);
  });

  it("missing source account / insufficient balance", async () => {
    const q = async (s: SwapClient) => s.quote({ input: TOKEN, output: TOKEN2, amount: 1_000_000n });
    const a = setup();
    await expect(a.swap.build({ quote: await q(a.swap), owner: OWNER, recentBlockhash: BLOCKHASH })).rejects.toThrow(/does not exist/);
    const b = setup({ existing: [ata(OWNER, TOKEN)], tokenBalance: "10" });
    await expect(b.swap.build({ quote: await q(b.swap), owner: OWNER, recentBlockhash: BLOCKHASH })).rejects.toThrow(/insufficient/);
    const c = setup({ sol: 1000 });
    const sq = await c.swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    await expect(c.swap.build({ quote: sq, owner: OWNER, recentBlockhash: BLOCKHASH })).rejects.toThrow(/insufficient SOL/);
  });

  it("invalid / tampered / expired quotes", async () => {
    const { swap } = setup();
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    await expect(swap.build({ quote: { ...quote, minOutAmount: 0n }, owner: OWNER })).rejects.toBeInstanceOf(ValidationError);
    await expect(swap.build({ quote: { ...quote, outputMint: TOKEN2 }, owner: OWNER })).rejects.toBeInstanceOf(ValidationError);
    await expect(swap.build({ quote: { ...quote, expiresAt: 0 }, owner: OWNER })).rejects.toThrow(/expired/);
    await expect(swap.build({ quote: { ...quote, provider: "other" }, owner: OWNER })).rejects.toThrow(/not registered/);
  });

  it("slippage protection is encoded and never bypassed", async () => {
    const { swap, provider } = setup();
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n, slippageBps: 100 });
    const r = await swap.build({ quote, owner: OWNER, recentBlockhash: BLOCKHASH });
    const ix = r.instructions.find((i) => i.programId === SWAP_PROGRAM)!;
    const minOut = new DataView(ix.data.buffer).getBigUint64(9, true);
    expect(minOut).toBe(quote.minOutAmount);
    expect((provider as MockSwapProvider).lastContext!.minOutAmount).toBe(quote.minOutAmount);
    // raising minOut above what the pool gives now fails the pool check
    await expect(swap.build({ quote: { ...quote, minOutAmount: quote.outAmount, outAmount: quote.outAmount, slippageBps: 0 }, owner: OWNER, recentBlockhash: BLOCKHASH })).resolves.toBeTruthy();
    await expect(swap.build({ quote: { ...quote, minOutAmount: quote.outAmount + 1n, outAmount: quote.outAmount + 1n }, owner: OWNER, recentBlockhash: BLOCKHASH })).rejects.toThrow(/slippage/);
    const weak = setup({ provider: new MockSwapProvider(false) });
    const wq = await weak.swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    await expect(weak.swap.build({ quote: wq, owner: OWNER })).rejects.toBeInstanceOf(UnsupportedOperationError);
  });

  it("quote-only providers cannot build", async () => {
    const rpc = new RpcClient({ provider: new MockRpcProvider({}) });
    const swap = new SwapClient([new PoolQuoteProvider(pools)], { rpc, builder: new BuilderClient(rpc) });
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    await expect(swap.build({ quote, owner: OWNER })).rejects.toBeInstanceOf(UnsupportedOperationError);
  });

  it("serializes and reports required signers", async () => {
    const { swap } = setup({ existing: [ata(OWNER, TOKEN)] });
    const quote = await swap.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n });
    const payer = addr(8);
    const r = await swap.build({ quote, owner: OWNER, feePayer: payer, recentBlockhash: BLOCKHASH });
    expect(r.requiredSigners).toEqual([payer, OWNER]);
    expect(r.estimatedFees.networkFeeLamports).toBe(10_000n);
    const wire = r.transaction.serialize();
    expect(typeof wire).toBe("string");
    expect(Buffer.from(wire, "base64")[0]).toBe(2); // two signature slots
    expect(r.recipientCheck ?? r.accounts.recipient).toBe(OWNER);
  });
});
