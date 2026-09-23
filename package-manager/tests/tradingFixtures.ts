/**
 * Demo trading environment built entirely from real SDK classes:
 * SolanaClient + MockRpcProvider + StaticTokenListProvider +
 * StaticPoolProvider + a demo SwapProvider.
 *
 * Everything here is FIXTURE DATA on a MOCK NETWORK. The demo swap program
 * address is fake; nothing is ever sent to Solana. Used by the Phase 7
 * integration test and the docs playground.
 */
import { SolanaClient } from "../core/SolanaClient.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { StaticTokenListProvider } from "../discovery/providers/StaticTokenListProvider.js";
import { StaticPoolProvider } from "../pools/providers/StaticPoolProvider.js";
import { PoolQuoteProvider } from "../swap/providers/PoolQuoteProvider.js";
import { MAINNET_USDC_MINT } from "../swap/SwapClient.js";
import type { PoolClient } from "../pools/PoolClient.js";
import type { Instruction } from "../builder/types.js";
import type { ResolvedQuoteRequest, SwapInstructionContext, SwapProvider, SwapQuote } from "../swap/types.js";
import { InstructionBuilder } from "../builder/InstructionBuilder.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { TOKEN_PROGRAM_ID } from "../utils/address.js";
import { encodeU64LE } from "../utils/bytes.js";
import { base58Encode } from "../utils/base58.js";
import { KeypairSigner } from "../wallet/KeypairSigner.js";

const addr = (n: number): string => base58Encode(new Uint8Array(32).fill(n));

export const DEMO_MINTS = {
  PHX: addr(61),
  BAY: addr(62),
  ISL: addr(63),
} as const;
export const DEMO_SWAP_PROGRAM = addr(69);
const DEMO_BLOCKHASH = addr(70);

/** Demo protocol: data = [1, amountIn u64, minOut u64]. minOut is always encoded. */
export class DemoSwapProvider implements SwapProvider {
  readonly name = "demo-amm";
  readonly enforcesMinOut = true;
  private readonly inner: PoolQuoteProvider;
  constructor(pools: PoolClient) {
    this.inner = new PoolQuoteProvider(pools, { name: "demo-amm" });
  }
  quote(r: ResolvedQuoteRequest): Promise<SwapQuote | null> {
    return this.inner.quote(r);
  }
  async buildSwapInstructions(ctx: SwapInstructionContext): Promise<Instruction[]> {
    const data = new Uint8Array(17);
    data[0] = 1;
    data.set(encodeU64LE(ctx.quote.inAmount), 1);
    data.set(encodeU64LE(ctx.minOutAmount), 9);
    return [{
      programId: DEMO_SWAP_PROGRAM,
      keys: [
        { address: ctx.owner, isSigner: true, isWritable: false },
        { address: ctx.sourceAccount, isSigner: false, isWritable: true },
        { address: ctx.destinationAccount, isSigner: false, isWritable: true },
        ...ctx.quote.pools.map((p) => ({ address: p, isSigner: false, isWritable: true })),
      ],
      data,
    }];
  }
}

export interface DemoTradingEnv {
  sdk: SolanaClient;
  wallet: KeypairSigner;
  rpc: MockRpcProvider;
  mints: typeof DEMO_MINTS;
}

export function createDemoTradingEnv(options: { wallet?: KeypairSigner; tokenBalance?: string } = {}): DemoTradingEnv {
  const wallet = options.wallet ?? KeypairSigner.generate();
  const { PHX, BAY, ISL } = DEMO_MINTS;
  const mintSet = new Set<string>([PHX, BAY, ISL, WRAPPED_SOL_MINT, MAINNET_USDC_MINT]);
  const decimals: Record<string, number> = { [WRAPPED_SOL_MINT]: 9 };
  // The wallet already holds PHX and BAY token accounts (so it can sell them).
  const existing = new Set<string>([PHX, BAY].map((m) => InstructionBuilder.associatedTokenAddress(wallet.address, m)));

  const rpc = new MockRpcProvider({
    getAccountInfo: (params: readonly unknown[]) => {
      const a = params[0] as string;
      const cfg = params[1] as { encoding?: string } | undefined;
      if (mintSet.has(a)) {
        const value = cfg?.encoding === "jsonParsed"
          ? { lamports: 1461600, owner: TOKEN_PROGRAM_ID, executable: false, rentEpoch: 0, space: 82,
              data: { program: "spl-token", parsed: { type: "mint", info: { decimals: decimals[a] ?? 6, supply: "1000000000000000", mintAuthority: null, freezeAuthority: null, isInitialized: true } }, space: 82 } }
          : { lamports: 1461600, owner: TOKEN_PROGRAM_ID, executable: false, rentEpoch: 0, data: ["", "base64"] };
        return { context: { slot: 1 }, value };
      }
      if (existing.has(a)) {
        return { context: { slot: 1 }, value: { lamports: 2039280, owner: TOKEN_PROGRAM_ID, executable: false, rentEpoch: 0, data: ["", "base64"] } };
      }
      return { context: { slot: 1 }, value: null };
    },
    getTokenAccountBalance: { context: { slot: 1 }, value: { amount: options.tokenBalance ?? "5000000000000", decimals: 6, uiAmount: 5_000_000, uiAmountString: "5000000" } },
    getBalance: { context: { slot: 1 }, value: 25_000_000_000 },
    getMinimumBalanceForRentExemption: 2_039_280,
    getLatestBlockhash: { context: { slot: 1 }, value: { blockhash: DEMO_BLOCKHASH, lastValidBlockHeight: 5_000 } },
    simulateTransaction: { context: { slot: 1 }, value: { err: null, logs: ["Program log: demo-amm swap (mock network)"], unitsConsumed: 48_210 } },
    sendTransaction: "DemoSignatureMockNetworkNotBroadcast111111111111111111111111111",
    getSignatureStatuses: { context: { slot: 1 }, value: [{ slot: 4242, confirmations: null, confirmationStatus: "confirmed", err: null }] },
    getBlockHeight: 100,
  });

  const sdk = new SolanaClient({ provider: rpc });

  sdk.tokens.discovery.register(
    new StaticTokenListProvider({
      name: "demo-list",
      attribution: "SolanaXPH demo fixtures (not real market data)",
      entries: [
        { mint: PHX, symbol: "PHX", name: "Phoenix Demo", decimals: 6, createdAt: "2026-09-20T00:00:00.000Z", verification: "unverified",
          market: { currency: "USD", price: 0.0123, priceChange24h: 4.2, volume24h: 182_000, liquidity: 410_000, asOf: "2026-09-23T00:00:00.000Z" } },
        { mint: BAY, symbol: "BAY", name: "Bayani Demo", decimals: 6, createdAt: "2026-09-22T00:00:00.000Z", verification: "unknown",
          market: { currency: "USD", price: 0.51, priceChange24h: -1.8, volume24h: 64_000, liquidity: 120_000, asOf: "2026-09-23T00:00:00.000Z" } },
        { mint: ISL, symbol: "ISL", name: "Isla Demo", decimals: 6, createdAt: "2026-09-10T00:00:00.000Z", verification: "unknown",
          market: { currency: "USD", volume24h: 9_500, asOf: "2026-09-23T00:00:00.000Z" } },
      ],
    }),
    { default: true },
  );

  sdk.pools.register(
    new StaticPoolProvider({
      name: "demo-pools",
      dex: "demo-amm",
      attribution: "SolanaXPH demo fixtures",
      pools: [
        { address: addr(81), programId: DEMO_SWAP_PROGRAM, poolType: "cpmm", feeBps: 25, liquidityUsd: 410_000, price: 0.0000812,
          tokenA: { mint: PHX, symbol: "PHX", decimals: 6, reserveRaw: "16600000000000" }, tokenB: { mint: WRAPPED_SOL_MINT, symbol: "SOL", decimals: 9, reserveRaw: "1350000000000" } },
        { address: addr(82), programId: DEMO_SWAP_PROGRAM, poolType: "cpmm", feeBps: 30, liquidityUsd: 98_000,
          tokenA: { mint: PHX, symbol: "PHX", decimals: 6, reserveRaw: "4000000000000" }, tokenB: { mint: MAINNET_USDC_MINT, symbol: "USDC", decimals: 6, reserveRaw: "49000000000" } },
        { address: addr(83), programId: DEMO_SWAP_PROGRAM, poolType: "cpmm", feeBps: 30, tvlUsd: 120_000,
          tokenA: { mint: PHX, symbol: "PHX", decimals: 6, reserveRaw: "4800000000000" }, tokenB: { mint: BAY, symbol: "BAY", decimals: 6, reserveRaw: "117000000000" } },
        { address: addr(84), programId: DEMO_SWAP_PROGRAM, poolType: "cpmm", feeBps: 25,
          tokenA: { mint: BAY, symbol: "BAY", decimals: 6, reserveRaw: "120000000000" }, tokenB: { mint: WRAPPED_SOL_MINT, symbol: "SOL", decimals: 9, reserveRaw: "400000000000" } },
      ],
    }),
  );

  // Replace the built-in quote-only provider with one that can also build.
  for (const name of sdk.swap.names) sdk.swap.unregister(name);
  sdk.swap.register(new DemoSwapProvider(sdk.pools));

  return { sdk, wallet, rpc, mints: DEMO_MINTS };
}
