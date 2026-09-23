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
import { RpcError, SwapExecutionError } from "../errors/index.js";
import { KeypairSigner } from "../wallet/KeypairSigner.js";

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

function setup(opts: { existing?: string[]; tokenBalance?: string; sol?: number; provider?: SwapProvider; overrides?: Record<string, unknown> } = {}) {
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
    getLatestBlockhash: { context: { slot: 1 }, value: { blockhash: BLOCKHASH, lastValidBlockHeight: 500 } },
    simulateTransaction: { context: { slot: 1 }, value: { err: null, logs: ["Program log: swap ok"], unitsConsumed: 42_000 } },
    sendTransaction: "5ig",
    getSignatureStatuses: { context: { slot: 1 }, value: [{ slot: 777, confirmations: null, confirmationStatus: "finalized", err: null }] },
    getBlockHeight: 100,
    ...(opts.overrides ?? {}),
  });
  const rpc = new RpcClient({ provider: rpcProvider });
  const provider = opts.provider ?? new MockSwapProvider();
  const swap = new SwapClient([provider], { rpc, builder: new BuilderClient(rpc) });
  return { swap, provider, rpcProvider };
}

const ata = (owner: string, m: string) => InstructionBuilder.associatedTokenAddress(owner, m);


const owner = KeypairSigner.generate();
async function built(s: SwapClient) {
  const quote = await s.quote({ input: "SOL", output: TOKEN, amount: 1_000_000n, slippageBps: 100 });
  return s.build({ quote, owner: owner.address });
}
const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as SwapExecutionError; } throw new Error("expected failure"); };

describe("swap execution", () => {
  it("full flow: quote -> build -> simulate -> sign -> send -> confirm", async () => {
    const { swap } = setup();
    const tx = await built(swap);
    expect(tx.transaction.isFullySigned()).toBe(false); // build never signs
    expect(tx.lastValidBlockHeight).toBe(500);
    const sim = await swap.simulate(tx);
    expect(sim.success).toBe(true);
    expect(sim.unitsConsumed).toBe(42_000);
    expect(sim.logs).toContain("Program log: swap ok");
    expect(tx.transaction.isFullySigned()).toBe(false); // simulate never signs
    const res = await swap.execute(tx, { signers: [owner], commitment: "finalized", pollIntervalMs: 1 });
    expect(res).toMatchObject({ signature: "5ig", confirmationStatus: "finalized", slot: 777, err: null });
    expect(tx.transaction.isFullySigned()).toBe(true);
    // slippage constraint survived to the signed transaction
    const ix = tx.instructions.find((i) => i.programId === SWAP_PROGRAM)!;
    expect(new DataView(ix.data.buffer).getBigUint64(9, true)).toBe(tx.quote.minOutAmount);
  });

  it("requires explicit, correct signers", async () => {
    const { swap } = setup();
    const tx = await built(swap);
    expect((await fail(swap.execute(tx, { signers: [] }))).reason).toBe("signer_mismatch");
    expect((await fail(swap.execute(tx, { signers: [KeypairSigner.generate()] }))).reason).toBe("signer_mismatch");
  });

  it("signer errors never echo secrets", async () => {
    const { swap } = setup();
    const tx = await built(swap);
    const bad = { address: owner.address, signMessageBytes: async () => { throw new Error("seed: abandon abandon SECRETKEY"); } };
    const e = await fail(swap.execute(tx, { signers: [bad], pollIntervalMs: 1 }));
    expect(e.reason).toBe("signing_failed");
    expect(e.message).not.toMatch(/SECRET|abandon/);
  });

  it("simulation failure is typed, keeps logs, and blocks sending", async () => {
    let sent = false;
    const { swap } = setup({ overrides: {
      simulateTransaction: { context: { slot: 1 }, value: { err: { InstructionError: [2, { Custom: 6001 }] }, logs: ["Program log: Error: exceeded slippage tolerance"], unitsConsumed: 9 } },
      sendTransaction: () => { sent = true; return "x"; },
    } });
    const tx = await built(swap);
    const sim = await swap.simulate(tx);
    expect(sim.success).toBe(false);
    expect(sim.failureReason).toBe("slippage_exceeded");
    const e = await fail(swap.execute(tx, { signers: [owner] }));
    expect(e).toBeInstanceOf(SwapExecutionError);
    expect(e.stage).toBe("simulate");
    expect(e.logs[0]).toMatch(/slippage/);
    expect(e.cause).toEqual({ InstructionError: [2, { Custom: 6001 }] });
    expect(sent).toBe(false);
    expect(tx.transaction.isFullySigned()).toBe(false);
  });

  it("insufficient funds and blockhash expiry from preflight", async () => {
    const reject = (message: string) => () => { throw new RpcError({ method: "sendTransaction", message, rpcCode: -32002, data: { logs: [] } }); };
    const a = setup({ overrides: { sendTransaction: reject("Attempt to debit an account but found no record of a prior credit. insufficient funds") } });
    expect((await fail(a.swap.execute(await built(a.swap), { signers: [owner], simulate: false }))).reason).toBe("insufficient_funds");
    const b = setup({ overrides: { sendTransaction: reject("Blockhash not found") } });
    expect((await fail(b.swap.execute(await built(b.swap), { signers: [owner], simulate: false }))).reason).toBe("blockhash_expired");
    const c = setup({ overrides: { sendTransaction: reject("custom program error") } });
    const e = await fail(c.swap.execute(await built(c.swap), { signers: [owner], simulate: false }));
    expect(e.reason).toBe("rejected");
    expect(e.cause).toBeInstanceOf(RpcError);
  });

  it("RPC failure during simulate", async () => {
    const { swap } = setup({ overrides: { simulateTransaction: () => { throw new Error("socket hang up"); } } });
    expect((await fail(swap.simulate(await built(swap)))).reason).toBe("rpc_error");
  });

  it("confirmation: on-chain failure, blockhash expiry, timeout", async () => {
    const a = setup({ overrides: { getSignatureStatuses: { context: { slot: 1 }, value: [{ slot: 9, confirmations: 0, confirmationStatus: "confirmed", err: { InstructionError: [2, "InsufficientFunds"] } }] } } });
    const ea = await fail(a.swap.execute(await built(a.swap), { signers: [owner], pollIntervalMs: 1 }));
    expect(ea.stage).toBe("confirm");
    expect(ea.signature).toBe("5ig");
    expect(ea.reason).toBe("insufficient_funds");
    const pending = { context: { slot: 1 }, value: [null] };
    const b = setup({ overrides: { getSignatureStatuses: pending, getBlockHeight: 501 } });
    expect((await fail(b.swap.execute(await built(b.swap), { signers: [owner], pollIntervalMs: 1 }))).reason).toBe("blockhash_expired");
    const c = setup({ overrides: { getSignatureStatuses: pending } });
    expect((await fail(c.swap.execute(await built(c.swap), { signers: [owner], pollIntervalMs: 1, timeoutMs: 5 }))).reason).toBe("timeout");
  });

  it("expired quote cannot be executed", async () => {
    const { swap } = setup();
    const tx = await built(swap);
    const e = await fail(swap.execute({ ...tx, quote: { ...tx.quote, expiresAt: 0 } }, { signers: [owner] }));
    expect(e.reason).toBe("quote_expired");
  });
});
