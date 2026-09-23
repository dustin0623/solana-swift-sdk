/**
 * Explicit swap execution: simulate → sign → send → confirm.
 * Nothing here runs unless the caller calls execute() with signers.
 * Signer errors are wrapped without echoing any key material.
 */
import { simulateBuilt, signTransaction } from "../builder/TransactionBuilder.js";
import { confirmSignature } from "../builder/confirm.js";
import {
  RpcError,
  SwapExecutionError,
  TransactionError,
  type SwapFailureReason,
} from "../errors/index.js";
import type { RpcClient } from "../rpc/RpcClient.js";
import type {
  SwapBuildResult,
  SwapExecuteOptions,
  SwapExecutionResult,
  SwapSimulation,
} from "./types.js";

/** Classifies a raw Solana error + logs. Returns null when nothing matches. */
export function classifySolanaFailure(error: unknown, logs: readonly string[] = []): SwapFailureReason | null {
  const text = `${safeStringify(error)}\n${logs.join("\n")}`.toLowerCase();
  if (text.includes("blockhashnotfound") || text.includes("blockhash not found") || text.includes("blockhash expired")) {
    return "blockhash_expired";
  }
  if (
    text.includes("insufficientfundsforfee") ||
    text.includes("insufficient funds") ||
    text.includes("insufficient lamports") ||
    text.includes("insufficientfundsforrent")
  ) {
    return "insufficient_funds";
  }
  if (text.includes("slippage") || text.includes("minimum amount out") || text.includes("exceededslippage") || text.includes("too little output")) {
    return "slippage_exceeded";
  }
  return null;
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  } catch {
    return String(value);
  }
}

function logsFrom(data: unknown): string[] {
  const logs = (data as { logs?: unknown } | null)?.logs;
  return Array.isArray(logs) ? logs.filter((l): l is string => typeof l === "string") : [];
}

export class SwapExecutor {
  constructor(private readonly rpc: RpcClient, private readonly now: () => number = Date.now) {}

  public async simulate(built: SwapBuildResult): Promise<SwapSimulation> {
    let result;
    try {
      result = await simulateBuilt(this.rpc, built.transaction);
    } catch (error) {
      throw new SwapExecutionError({
        reason: "rpc_error", stage: "simulate", cause: error,
        message: `Simulation request failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return {
      ...result,
      failureReason: result.success ? null : (classifySolanaFailure(result.error, result.logs) ?? "simulation_failed"),
    };
  }

  public async execute(built: SwapBuildResult, options: SwapExecuteOptions): Promise<SwapExecutionResult> {
    const { quote, transaction } = built;
    if (this.now() >= quote.expiresAt) {
      throw new SwapExecutionError({ reason: "quote_expired", stage: "validate", message: "Quote has expired; build again from a fresh quote." });
    }

    // Signers must exactly cover the missing required signatures.
    const required = transaction.message.accountKeys.slice(0, transaction.message.numRequiredSignatures);
    const signers = options.signers ?? [];
    for (const signer of signers) {
      if (!required.includes(signer.address)) {
        throw new SwapExecutionError({ reason: "signer_mismatch", stage: "validate", message: `${signer.address} is not a required signer for this transaction` });
      }
    }
    const missing = required.filter((a) => !transaction.signatures.has(a) && !signers.some((s) => s.address === a));
    if (missing.length > 0) {
      throw new SwapExecutionError({ reason: "signer_mismatch", stage: "validate", message: `Missing signers: ${missing.join(", ")}` });
    }

    // 1. Simulate
    let simulation: SwapSimulation | null = null;
    if (options.simulate !== false) {
      simulation = await this.simulate(built);
      if (!simulation.success) {
        throw new SwapExecutionError({
          reason: simulation.failureReason ?? "simulation_failed", stage: "simulate",
          message: `Simulation failed: ${safeStringify(simulation.error)}`,
          logs: simulation.logs, cause: simulation.error,
        });
      }
    }

    // 2. Sign (signs the exact message bytes the caller inspected)
    for (const signer of signers) {
      try {
        await signTransaction(transaction, signer);
      } catch (error) {
        const name = error instanceof Error ? error.name : "Error";
        throw new SwapExecutionError({
          reason: "signing_failed", stage: "sign", cause: error,
          message: `Signer ${signer.address} failed to sign (${name}).`,
        });
      }
    }
    if (!transaction.isFullySigned()) {
      throw new SwapExecutionError({ reason: "signer_mismatch", stage: "sign", message: "Transaction is not fully signed." });
    }

    // 3. Send (never retried automatically)
    let signature: string;
    try {
      signature = await this.rpc.sendTransaction(transaction.serialize(), {
        skipPreflight: options.skipPreflight ?? false,
        ...(options.commitment ? { preflightCommitment: options.commitment } : {}),
      });
    } catch (error) {
      const logs = error instanceof RpcError ? logsFrom(error.data) : [];
      const data = error instanceof RpcError ? error.data : undefined;
      const reason = classifySolanaFailure([error instanceof Error ? error.message : error, data], logs)
        ?? (error instanceof RpcError ? "rejected" : "rpc_error");
      throw new SwapExecutionError({
        reason, stage: "send", logs, cause: error,
        message: `Transaction was not accepted: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    // 4. Confirm
    try {
      const status = await confirmSignature(this.rpc, signature, {
        commitment: options.commitment ?? "confirmed",
        ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
        ...(options.pollIntervalMs !== undefined ? { pollIntervalMs: options.pollIntervalMs } : {}),
        ...(built.lastValidBlockHeight !== null ? { lastValidBlockHeight: built.lastValidBlockHeight } : {}),
      });
      return {
        signature,
        confirmationStatus: status.confirmationStatus,
        slot: status.slot,
        err: null,
        simulation,
        quote,
      };
    } catch (error) {
      let reason: SwapFailureReason = "confirmation_failed";
      const msg = error instanceof Error ? error.message : String(error);
      if (error instanceof TransactionError) {
        if (msg.includes("Blockhash expired")) reason = "blockhash_expired";
        else if (msg.includes("within")) reason = "timeout";
        else reason = classifySolanaFailure(error.cause) ?? "confirmation_failed";
      } else if (!(error instanceof TransactionError)) {
        reason = "rpc_error";
      }
      throw new SwapExecutionError({ reason, stage: "confirm", signature, cause: error, message: msg });
    }
  }
}
