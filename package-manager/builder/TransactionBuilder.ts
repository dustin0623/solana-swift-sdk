import { SimulationError, ValidationError } from "../errors/index";
import type { RpcClient } from "../rpc/RpcClient";
import type {
  Address,
  Commitment,
  Signature,
  SimulationResult,
  TransactionStatusInfo,
} from "../types/index";
import { assertAddress } from "../utils/address";
import { solToLamports } from "../utils/amount";
import type { SolanaSigner } from "../wallet/Signer";
import { confirmSignature, type ConfirmOptions } from "./confirm";
import { InstructionBuilder } from "./InstructionBuilder";
import { MessageCompiler } from "./MessageCompiler";
import type { BuiltTransaction, CompiledMessage, Instruction, TransactionVersion } from "./types";

export interface BuildOptions {
  feePayer?: Address;
  recentBlockhash?: string;
  version?: TransactionVersion;
  commitment?: Commitment;
}

export interface SendOptions extends BuildOptions {
  signers?: readonly SolanaSigner[];
  skipPreflight?: boolean;
  preflightCommitment?: Commitment;
}

/**
 * Composes instructions into a transaction.
 *
 * The stages stay distinct: instruction → message → signed transaction →
 * signature → confirmation. Building never broadcasts; `send()` is the only
 * method that reaches the network with a transaction.
 */
export class TransactionBuilder {
  private readonly instructions: Instruction[] = [];
  private payer: Address | null = null;
  private version: TransactionVersion = 0;
  private blockhash: string | null = null;
  private lastValidBlockHeight: number | null = null;
  private readonly signers: SolanaSigner[] = [];

  constructor(private readonly rpc: RpcClient) {}

  /* ── Composition ───────────────────────────────────────────────────── */

  public add(...instructions: readonly Instruction[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  public feePayer(address: Address): this {
    this.payer = assertAddress(address, "feePayer");
    return this;
  }

  public withVersion(version: TransactionVersion): this {
    this.version = version;
    return this;
  }

  public withBlockhash(blockhash: string, lastValidBlockHeight?: number): this {
    this.blockhash = blockhash;
    this.lastValidBlockHeight = lastValidBlockHeight ?? null;
    return this;
  }

  /** Native SOL transfer. `amount` is a decimal SOL string; no floats. */
  public transfer(options: {
    from?: Address;
    to: Address;
    amount?: string | bigint;
    lamports?: bigint;
  }): this {
    const from = options.from ?? this.payer;
    if (!from) throw new ValidationError("A fee payer or `from` address is required", "from");
    const lamports =
      options.lamports ?? solToLamports(options.amount ?? "0");
    this.payer ??= assertAddress(from, "from");
    return this.add(InstructionBuilder.transferSol({ from, to: options.to, lamports }));
  }

  public memo(text: string): this {
    return this.add(InstructionBuilder.memo(text, this.payer ? [this.payer] : []));
  }

  /** Priority fee in micro-lamports per compute unit. */
  public priorityFee(microLamports: bigint): this {
    return this.add(InstructionBuilder.setComputeUnitPrice(microLamports));
  }

  public computeUnitLimit(units: number): this {
    return this.add(InstructionBuilder.setComputeUnitLimit(units));
  }

  public signWith(...signers: readonly SolanaSigner[]): this {
    this.signers.push(...signers);
    return this;
  }

  /* ── Compilation ───────────────────────────────────────────────────── */

  public async build(options: BuildOptions = {}): Promise<BuiltTransaction> {
    const feePayer = options.feePayer ?? this.payer ?? this.signers[0]?.address;
    if (!feePayer) throw new ValidationError("A fee payer is required", "feePayer");

    let blockhash = options.recentBlockhash ?? this.blockhash;
    if (!blockhash) {
      const latest = await this.rpc.getLatestBlockhash(
        options.commitment ? { commitment: options.commitment } : undefined,
      );
      blockhash = latest.value.blockhash;
      this.lastValidBlockHeight = latest.value.lastValidBlockHeight;
    }

    const message = MessageCompiler.compile({
      feePayer,
      recentBlockhash: blockhash,
      instructions: this.instructions,
      version: options.version ?? this.version,
    });

    const transaction = createBuiltTransaction(message);
    for (const signer of this.signers) await signTransaction(transaction, signer);
    return transaction;
  }

  /** Simulates without signing requirements. Never broadcasts. */
  public async simulate(options: BuildOptions = {}): Promise<SimulationResult> {
    const built = await this.build(options);
    return simulateBuilt(this.rpc, built, options.commitment);
  }

  /**
   * Signs (if signers were supplied), broadcasts once and returns the
   * signature. No automatic retry: resending can duplicate side effects.
   */
  public async send(options: SendOptions = {}): Promise<Signature> {
    const built = await this.build(options);
    for (const signer of options.signers ?? []) await signTransaction(built, signer);

    if (!built.isFullySigned()) {
      throw new ValidationError(
        "Transaction is missing required signatures — sign it before sending",
        "signers",
      );
    }

    return this.rpc.sendTransaction(built.serialize(), {
      skipPreflight: options.skipPreflight ?? false,
      ...(options.preflightCommitment ? { preflightCommitment: options.preflightCommitment } : {}),
    });
  }

  /** Sends, then waits for the requested commitment. */
  public async sendAndConfirm(
    options: SendOptions & ConfirmOptions = {},
  ): Promise<{ signature: Signature; status: TransactionStatusInfo }> {
    const signature = await this.send(options);
    const status = await confirmSignature(this.rpc, signature, {
      ...options,
      ...(this.lastValidBlockHeight !== null
        ? { lastValidBlockHeight: this.lastValidBlockHeight }
        : {}),
    });
    return { signature, status };
  }
}

export function createBuiltTransaction(message: CompiledMessage): BuiltTransaction {
  const signatures = new Map<Address, Uint8Array>();
  return {
    message,
    signatures,
    serialize: () => MessageCompiler.serialize(message, signatures),
    isFullySigned: () =>
      message.accountKeys
        .slice(0, message.numRequiredSignatures)
        .every((address) => signatures.has(address)),
  };
}

/** Adds one signer's signature to an already compiled transaction. */
export async function signTransaction(
  transaction: BuiltTransaction,
  signer: SolanaSigner,
): Promise<BuiltTransaction> {
  const required = transaction.message.accountKeys.slice(
    0,
    transaction.message.numRequiredSignatures,
  );
  if (!required.includes(signer.address)) {
    throw new ValidationError(
      `${signer.address} is not a required signer for this transaction`,
      "signer",
    );
  }
  transaction.signatures.set(
    signer.address,
    await signer.signMessageBytes(transaction.message.bytes),
  );
  return transaction;
}

export async function simulateBuilt(
  rpc: RpcClient,
  transaction: BuiltTransaction,
  commitment?: Commitment,
): Promise<SimulationResult> {
  const response = await rpc.simulateTransaction(transaction.serialize(), {
    sigVerify: false,
    replaceRecentBlockhash: true,
    ...(commitment ? { commitment } : {}),
  });
  const value = response.value;
  return {
    success: !value.err,
    error: value.err ?? null,
    logs: value.logs ?? [],
    unitsConsumed: value.unitsConsumed ?? null,
    returnData: value.returnData ?? null,
    raw: response,
  };
}

/** Throws a SimulationError with logs attached when a simulation failed. */
export function assertSimulationSucceeded(result: SimulationResult): SimulationResult {
  if (!result.success) {
    throw new SimulationError({
      message: `Simulation failed: ${JSON.stringify(result.error)}`,
      logs: result.logs,
      error: result.error,
      ...(result.unitsConsumed !== null ? { unitsConsumed: result.unitsConsumed } : {}),
    });
  }
  return result;
}
