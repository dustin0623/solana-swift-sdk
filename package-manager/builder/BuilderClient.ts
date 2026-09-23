import type { RpcClient } from "../rpc/RpcClient.js";
import type { Address, SimulationResult, Commitment } from "../types/index.js";
import { InstructionBuilder } from "./InstructionBuilder.js";
import { simulateBuilt, TransactionBuilder } from "./TransactionBuilder.js";
import type { BuiltTransaction, Instruction } from "./types.js";

/**
 * `solana.builder` — a factory for transaction builders.
 *
 * Each call starts a fresh builder, so builders are never shared or reused by
 * accident.
 */
export class BuilderClient {
  /** Instruction-level helpers: `solana.builder.instruction.transferSol(...)`. */
  public readonly instruction = InstructionBuilder;

  constructor(private readonly rpc: RpcClient) {}

  public create(): TransactionBuilder {
    return new TransactionBuilder(this.rpc);
  }

  public add(...instructions: readonly Instruction[]): TransactionBuilder {
    return this.create().add(...instructions);
  }

  public transfer(options: {
    from?: Address;
    to: Address;
    amount?: string | bigint;
    lamports?: bigint;
  }): TransactionBuilder {
    return this.create().transfer(options);
  }

  /** Simulates an already built transaction. */
  public simulate(
    transaction: BuiltTransaction,
    commitment?: Commitment,
  ): Promise<SimulationResult> {
    return simulateBuilt(this.rpc, transaction, commitment);
  }
}
