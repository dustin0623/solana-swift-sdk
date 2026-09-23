/**
 * sdk.swap — quote-only. This client never signs, broadcasts or executes.
 */
import { ProviderError, UnsupportedOperationError, ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { isValidAddress } from "../utils/address.js";
import { assertBps } from "./math.js";
import type { BuilderClient } from "../builder/BuilderClient.js";
import type { RpcClient } from "../rpc/RpcClient.js";
import { SwapExecutor } from "./SwapExecutor.js";
import { SwapTransactionBuilder, assertQuoteShape, isSwapProvider } from "./SwapTransactionBuilder.js";
import type {
  SwapBuildParams,
  SwapBuildResult,
  SwapExecuteOptions,
  SwapExecutionResult,
  SwapSimulation,
  SwapQuote,
  SwapQuoteParams,
  SwapQuoteProvider,
  SwapTokenInput,
} from "./types.js";

export const MAINNET_USDC_MINT: Address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface SwapClientOptions {
  /** Mint used for the "USDC" alias. Default: mainnet USDC. */
  usdcMint?: Address;
  /** Largest accepted slippageBps. Default 1000 (10%). */
  maxSlippageBps?: number;
  defaultSlippageBps?: number;
  now?: () => number;
  /** Required for build(). Supplied automatically by SolanaClient. */
  rpc?: RpcClient;
  builder?: BuilderClient;
}

export class SwapClient {
  private readonly providers = new Map<string, SwapQuoteProvider>();
  private readonly usdcMint: Address;
  private readonly maxSlippageBps: number;
  private readonly defaultSlippageBps: number;
  private readonly now: () => number;
  private readonly txBuilder: SwapTransactionBuilder | null;
  private readonly executor: SwapExecutor | null;

  constructor(providers: readonly SwapQuoteProvider[] = [], options: SwapClientOptions = {}) {
    this.usdcMint = options.usdcMint ?? MAINNET_USDC_MINT;
    this.maxSlippageBps = options.maxSlippageBps ?? 1_000;
    this.defaultSlippageBps = options.defaultSlippageBps ?? 50;
    this.now = options.now ?? Date.now;
    this.executor = options.rpc ? new SwapExecutor(options.rpc, this.now) : null;
    this.txBuilder = options.rpc && options.builder ? new SwapTransactionBuilder(options.rpc, options.builder) : null;
    for (const p of providers) this.register(p);
  }

  public register(provider: SwapQuoteProvider): this {
    this.providers.set(provider.name, provider);
    return this;
  }

  public unregister(name: string): this {
    this.providers.delete(name);
    return this;
  }

  public get names(): string[] {
    return [...this.providers.keys()];
  }

  public resolveMint(token: SwapTokenInput, field = "token"): Address {
    if (token === "SOL") return WRAPPED_SOL_MINT;
    if (token === "USDC") return this.usdcMint;
    if (!isValidAddress(token)) throw new ValidationError(`"${token}" is not a valid mint`, field);
    return token;
  }

  /** Best quote across providers (highest outAmount). Throws if none found. */
  public async quote(params: SwapQuoteParams): Promise<SwapQuote> {
    const inputMint = this.resolveMint(params.input, "input");
    const outputMint = this.resolveMint(params.output, "output");
    if (inputMint === outputMint) {
      throw new ValidationError("input and output must be different tokens", "output");
    }
    if (typeof params.amount !== "bigint") {
      throw new ValidationError("amount must be a bigint in base units", "amount");
    }
    if (params.amount <= 0n) throw new ValidationError("amount must be greater than zero", "amount");
    const slippageBps = params.slippageBps ?? this.defaultSlippageBps;
    assertBps(slippageBps, "slippageBps", this.maxSlippageBps);

    const candidates = params.provider
      ? [this.resolveProvider(params.provider)]
      : [...this.providers.values()];
    if (candidates.length === 0) {
      throw new UnsupportedOperationError(
        "No swap quote provider is registered. Register one with sdk.swap.register(provider).",
      );
    }

    const request = { inputMint, outputMint, amount: params.amount, slippageBps };
    const errors: string[] = [];
    let best: SwapQuote | null = null;
    for (const provider of candidates) {
      try {
        const q = await provider.quote(request);
        if (q && (!best || q.outAmount > best.outAmount)) best = q;
      } catch (error) {
        if (error instanceof ValidationError || error instanceof UnsupportedOperationError) {
          errors.push(`${provider.name}: ${error.message}`);
          continue;
        }
        errors.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!best) {
      throw new ProviderError(
        "swap",
        `No route with sufficient liquidity for ${inputMint} -> ${outputMint}` +
          (errors.length ? ` (${errors.join("; ")})` : ""),
      );
    }
    return best;
  }

  public isExpired(quote: SwapQuote): boolean {
    return this.now() >= quote.expiresAt;
  }

  /** Throws when the quote has expired and must be refreshed. */
  public assertFresh(quote: SwapQuote): void {
    if (this.isExpired(quote)) throw new ValidationError("quote has expired; request a new one", "quote");
  }

  /**
   * Builds an UNSIGNED swap transaction from a quote. Never signs or
   * broadcasts. Validates freshness, amounts, mints, accounts, slippage,
   * balances and pool availability first.
   */
  public async build(params: SwapBuildParams): Promise<SwapBuildResult> {
    if (!this.txBuilder) throw new UnsupportedOperationError("swap.build() needs an RPC client; use it via SolanaClient.");
    const quote = params.quote;
    assertQuoteShape(quote);
    this.assertFresh(quote);
    if (quote.slippageBps > this.maxSlippageBps) {
      throw new ValidationError(`quote slippage ${quote.slippageBps} bps exceeds max ${this.maxSlippageBps}`, "slippageBps");
    }
    const provider = this.providers.get(quote.provider);
    if (!provider) throw new ValidationError(`quote provider "${quote.provider}" is not registered`, "quote");
    if (!isSwapProvider(provider)) {
      throw new UnsupportedOperationError(`Provider "${provider.name}" can quote but cannot build swap transactions.`);
    }
    return this.txBuilder.build(provider, params);
  }

  /** Simulates a built swap. Never signs or broadcasts. */
  public async simulate(built: SwapBuildResult): Promise<SwapSimulation> {
    return this.requireExecutor().simulate(built);
  }

  /**
   * Explicit execution: simulate → sign with the given signers → send →
   * confirm. The only swap method that signs or reaches the network with a
   * transaction.
   */
  public async execute(built: SwapBuildResult, options: SwapExecuteOptions): Promise<SwapExecutionResult> {
    return this.requireExecutor().execute(built, options);
  }

  private requireExecutor(): SwapExecutor {
    if (!this.executor) throw new UnsupportedOperationError("swap execution needs an RPC client; use it via SolanaClient.");
    return this.executor;
  }

  private resolveProvider(name: string): SwapQuoteProvider {
    const p = this.providers.get(name);
    if (!p) throw new ValidationError(`Unknown swap quote provider "${name}"`, "provider");
    return p;
  }
}
