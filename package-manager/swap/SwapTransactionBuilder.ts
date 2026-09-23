/**
 * Turns a validated SwapQuote into an UNSIGNED transaction using the existing
 * TransactionBuilder. Never signs, never broadcasts.
 */
import type { BuilderClient } from "../builder/BuilderClient.js";
import { InstructionBuilder, type TokenProgramId } from "../builder/InstructionBuilder.js";
import type { Instruction } from "../builder/types.js";
import { ValidationError, UnsupportedOperationError } from "../errors/index.js";
import type { RpcClient } from "../rpc/RpcClient.js";
import type { Address } from "../types/index.js";
import { WRAPPED_SOL_MINT } from "../types/token.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, assertAddress, isValidAddress } from "../utils/address.js";
import type { SwapBuildParams, SwapBuildResult, SwapProvider, SwapQuote } from "./types.js";

const TOKEN_ACCOUNT_SIZE = 165;
const SIGNATURE_FEE = 5_000n;
const DEFAULT_CU = 200_000n;

export function isSwapProvider(p: unknown): p is SwapProvider {
  return typeof (p as SwapProvider)?.buildSwapInstructions === "function";
}

export function assertQuoteShape(q: SwapQuote): void {
  if (!q || typeof q !== "object") throw new ValidationError("quote is required", "quote");
  if (!isValidAddress(q.inputMint)) throw new ValidationError("quote.inputMint is invalid", "quote");
  if (!isValidAddress(q.outputMint)) throw new ValidationError("quote.outputMint is invalid", "quote");
  if (q.inputMint === q.outputMint) throw new ValidationError("quote input and output are the same", "quote");
  for (const k of ["inAmount", "outAmount", "minOutAmount"] as const) {
    if (typeof q[k] !== "bigint") throw new ValidationError(`quote.${k} must be a bigint`, "quote");
  }
  if (q.inAmount <= 0n) throw new ValidationError("quote.inAmount must be > 0", "quote");
  if (q.minOutAmount <= 0n) throw new ValidationError("quote.minOutAmount must be > 0 — slippage protection cannot be disabled", "quote");
  if (q.minOutAmount > q.outAmount) throw new ValidationError("quote.minOutAmount exceeds outAmount", "quote");
  if (!Number.isInteger(q.slippageBps) || q.slippageBps < 0 || q.slippageBps >= 10_000) {
    throw new ValidationError("quote.slippageBps is invalid", "quote");
  }
  if (!Array.isArray(q.route) || q.route.length === 0) throw new ValidationError("quote has no route", "quote");
  const first = q.route[0]!, last = q.route[q.route.length - 1]!;
  if (first.inputMint !== q.inputMint || last.outputMint !== q.outputMint || first.amountIn !== q.inAmount) {
    throw new ValidationError("quote route does not match its input/output", "quote");
  }
}

export class SwapTransactionBuilder {
  constructor(private readonly rpc: RpcClient, private readonly builder: BuilderClient) {}

  private async tokenProgramOf(mint: Address): Promise<TokenProgramId> {
    if (mint === WRAPPED_SOL_MINT) return TOKEN_PROGRAM_ID;
    const info = await this.rpc.getAccountInfo(mint);
    const owner = (info.value as { owner?: string } | null)?.owner;
    if (!owner) throw new ValidationError(`mint ${mint} does not exist`, "mint");
    if (owner !== TOKEN_PROGRAM_ID && owner !== TOKEN_2022_PROGRAM_ID) {
      throw new ValidationError(`${mint} is not an SPL token mint`, "mint");
    }
    return owner as TokenProgramId;
  }

  private async exists(address: Address): Promise<boolean> {
    const info = await this.rpc.getAccountInfo(address);
    return info.value !== null && info.value !== undefined;
  }

  public async build(provider: SwapProvider, params: SwapBuildParams): Promise<SwapBuildResult> {
    const { quote } = params;
    if (!provider.enforcesMinOut) {
      throw new UnsupportedOperationError(
        `Provider "${provider.name}" cannot enforce a minimum output on-chain; refusing to build an unprotected swap.`,
      );
    }
    const owner = assertAddress(params.owner, "owner");
    const recipient = assertAddress(params.recipient ?? owner, "recipient");
    const feePayer = assertAddress(params.feePayer ?? owner, "feePayer");
    const wrapSol = params.wrapSol !== false && quote.inputMint === WRAPPED_SOL_MINT;
    const unwrapSol = params.unwrapSol !== false && quote.outputMint === WRAPPED_SOL_MINT && recipient === owner;
    const warnings: string[] = [
      "A successfully built transaction may still fail on-chain (pool state, balances or fees can change before execution).",
    ];

    const [inProg, outProg] = await Promise.all([
      this.tokenProgramOf(quote.inputMint),
      this.tokenProgramOf(quote.outputMint),
    ]);

    const source = InstructionBuilder.associatedTokenAddress(owner, quote.inputMint, inProg);
    const destination = InstructionBuilder.associatedTokenAddress(recipient, quote.outputMint, outProg);
    const [sourceExists, destExists] = await Promise.all([this.exists(source), this.exists(destination)]);

    // Pool availability: re-quote and require the fresh output still satisfies minOut.
    if (!params.skipPoolCheck) {
      const fresh = await provider.quote({
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        amount: quote.inAmount,
        slippageBps: quote.slippageBps,
      });
      if (!fresh) throw new ValidationError("pool is no longer available for this quote", "quote");
      if (fresh.outAmount < quote.minOutAmount) {
        throw new ValidationError("pool price moved beyond slippage tolerance; request a new quote", "quote");
      }
    }

    // Balances.
    if (!wrapSol) {
      if (!sourceExists) throw new ValidationError(`source token account ${source} does not exist`, "source");
      const bal = await this.rpc.getTokenAccountBalance(source);
      if (BigInt(bal.value.amount) < quote.inAmount) {
        throw new ValidationError(`insufficient ${quote.inputMint} balance: have ${bal.value.amount}, need ${quote.inAmount}`, "amount");
      }
    }

    const pre: Instruction[] = [];
    const post: Instruction[] = [];
    const created: Address[] = [];
    let rentEach = 0n;
    const needsRent = (wrapSol && !sourceExists) || !destExists;
    if (needsRent) {
      rentEach = BigInt(await this.rpc.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE));
    }

    if (params.computeUnitLimit) pre.push(InstructionBuilder.setComputeUnitLimit(params.computeUnitLimit));
    if (params.priorityFeeMicroLamports) pre.push(InstructionBuilder.setComputeUnitPrice(params.priorityFeeMicroLamports));

    if (wrapSol) {
      if (!sourceExists) {
        pre.push(InstructionBuilder.createAssociatedTokenAccount({ payer: feePayer, owner, mint: WRAPPED_SOL_MINT }));
        created.push(source);
      }
      pre.push(InstructionBuilder.transferSol({ from: owner, to: source, lamports: quote.inAmount }));
      pre.push(InstructionBuilder.syncNative(source));
      if (!sourceExists) {
        post.push(InstructionBuilder.closeTokenAccount({ account: source, destination: owner, owner }));
      }
    }
    if (!destExists) {
      pre.push(InstructionBuilder.createAssociatedTokenAccount({
        payer: feePayer, owner: recipient, mint: quote.outputMint, programId: outProg,
      }));
      created.push(destination);
      if (unwrapSol) post.push(InstructionBuilder.closeTokenAccount({ account: destination, destination: owner, owner }));
    } else if (quote.outputMint === WRAPPED_SOL_MINT) {
      warnings.push("Output wSOL account already exists; it is left open so pre-existing wSOL is not unwrapped.");
    }

    const swapIxs = await provider.buildSwapInstructions({
      quote, owner, sourceAccount: source, destinationAccount: destination,
      inputTokenProgram: inProg, outputTokenProgram: outProg, minOutAmount: quote.minOutAmount,
    });
    if (!Array.isArray(swapIxs) || swapIxs.length === 0) {
      throw new ValidationError(`provider "${provider.name}" returned no swap instructions`, "provider");
    }
    const instructions = [...pre, ...swapIxs, ...post];

    const tx = this.builder.create().add(...instructions).feePayer(feePayer);
    if (params.version !== undefined) tx.withVersion(params.version);
    const transaction = await tx.build(params.recentBlockhash ? { recentBlockhash: params.recentBlockhash } : {});
    const m = transaction.message;
    const requiredSigners = m.accountKeys.slice(0, m.numRequiredSignatures);

    const networkFeeLamports = SIGNATURE_FEE * BigInt(requiredSigners.length);
    const cu = params.computeUnitLimit ? BigInt(params.computeUnitLimit) : DEFAULT_CU;
    const priorityFeeLamports = params.priorityFeeMicroLamports
      ? (params.priorityFeeMicroLamports * cu + 999_999n) / 1_000_000n : 0n;
    const rentLamports = rentEach * BigInt(created.length);
    const wrappedSolLamports = wrapSol ? quote.inAmount : 0n;
    const totalSolRequired = networkFeeLamports + priorityFeeLamports + rentLamports + wrappedSolLamports;

    const payerBal = BigInt((await this.rpc.getBalance(feePayer)).value);
    const ownerNeeds = feePayer === owner ? totalSolRequired : wrappedSolLamports;
    const payerNeeds = feePayer === owner ? totalSolRequired : totalSolRequired - wrappedSolLamports;
    if (payerBal < payerNeeds) {
      throw new ValidationError(`insufficient SOL: fee payer has ${payerBal} lamports, needs ${payerNeeds}`, "balance");
    }
    if (feePayer !== owner && ownerNeeds > 0n) {
      const ownerBal = BigInt((await this.rpc.getBalance(owner)).value);
      if (ownerBal < ownerNeeds) throw new ValidationError(`insufficient SOL: owner has ${ownerBal}, needs ${ownerNeeds}`, "balance");
    }

    return {
      transaction, instructions, quote, requiredSigners,
      estimatedFees: { networkFeeLamports, priorityFeeLamports, rentLamports, wrappedSolLamports, totalSolRequired },
      accounts: { source, destination, recipient, created },
      warnings,
    };
  }
}
