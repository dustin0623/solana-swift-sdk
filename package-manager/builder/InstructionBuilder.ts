import { ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  assertAddress,
} from "../utils/address.js";
import { addressToBytes } from "../utils/address.js";
import { concatBytes, encodeU32LE, encodeU64LE } from "../utils/bytes.js";
import { findProgramAddress } from "../utils/pda.js";
import type { Instruction } from "./types.js";

/** SPL Token instruction discriminators actually used by this SDK. */
const TOKEN_IX = {
  transfer: 3,
  mintTo: 7,
  burn: 8,
  closeAccount: 9,
  transferChecked: 12,
  burnChecked: 15,
} as const;

type TokenProgram = typeof TOKEN_PROGRAM_ID | typeof TOKEN_2022_PROGRAM_ID;

/**
 * Builds single instructions.
 *
 * Only well-specified system, SPL Token, Associated Token, Memo and Compute
 * Budget instructions are encoded here. Application programs use `custom()`.
 */
export class InstructionBuilder {
  /** Native SOL transfer. `lamports` is an exact integer, never a float. */
  public static transferSol(options: {
    from: Address;
    to: Address;
    lamports: bigint;
  }): Instruction {
    if (options.lamports <= 0n) {
      throw new ValidationError("Transfer amount must be greater than zero", "amount");
    }
    return {
      programId: SYSTEM_PROGRAM_ID,
      keys: [
        { address: assertAddress(options.from, "from"), isSigner: true, isWritable: true },
        { address: assertAddress(options.to, "to"), isSigner: false, isWritable: true },
      ],
      // System instruction 2 = Transfer, little-endian u32 discriminator.
      data: concatBytes(encodeU32LE(2), encodeU64LE(options.lamports)),
    };
  }

  /** SPL `TransferChecked` — mint and decimals are verified on chain. */
  public static transferTokensChecked(options: {
    source: Address;
    mint: Address;
    destination: Address;
    authority: Address;
    amount: bigint;
    decimals: number;
    programId?: TokenProgram;
  }): Instruction {
    if (options.amount <= 0n) {
      throw new ValidationError("Transfer amount must be greater than zero", "amount");
    }
    return {
      programId: options.programId ?? TOKEN_PROGRAM_ID,
      keys: [
        { address: assertAddress(options.source, "source"), isSigner: false, isWritable: true },
        { address: assertAddress(options.mint, "mint"), isSigner: false, isWritable: false },
        {
          address: assertAddress(options.destination, "destination"),
          isSigner: false,
          isWritable: true,
        },
        { address: assertAddress(options.authority, "authority"), isSigner: true, isWritable: false },
      ],
      data: concatBytes(
        Uint8Array.of(TOKEN_IX.transferChecked),
        encodeU64LE(options.amount),
        Uint8Array.of(options.decimals),
      ),
    };
  }

  public static mintTo(options: {
    mint: Address;
    destination: Address;
    authority: Address;
    amount: bigint;
    programId?: TokenProgram;
  }): Instruction {
    return {
      programId: options.programId ?? TOKEN_PROGRAM_ID,
      keys: [
        { address: assertAddress(options.mint, "mint"), isSigner: false, isWritable: true },
        {
          address: assertAddress(options.destination, "destination"),
          isSigner: false,
          isWritable: true,
        },
        { address: assertAddress(options.authority, "authority"), isSigner: true, isWritable: false },
      ],
      data: concatBytes(Uint8Array.of(TOKEN_IX.mintTo), encodeU64LE(options.amount)),
    };
  }

  public static burn(options: {
    account: Address;
    mint: Address;
    authority: Address;
    amount: bigint;
    programId?: TokenProgram;
  }): Instruction {
    return {
      programId: options.programId ?? TOKEN_PROGRAM_ID,
      keys: [
        { address: assertAddress(options.account, "account"), isSigner: false, isWritable: true },
        { address: assertAddress(options.mint, "mint"), isSigner: false, isWritable: true },
        { address: assertAddress(options.authority, "authority"), isSigner: true, isWritable: false },
      ],
      data: concatBytes(Uint8Array.of(TOKEN_IX.burn), encodeU64LE(options.amount)),
    };
  }

  /** Creates an associated token account; idempotent variant by default. */
  public static createAssociatedTokenAccount(options: {
    payer: Address;
    owner: Address;
    mint: Address;
    programId?: TokenProgram;
    idempotent?: boolean;
  }): Instruction {
    const tokenProgram = options.programId ?? TOKEN_PROGRAM_ID;
    const ata = InstructionBuilder.associatedTokenAddress(
      options.owner,
      options.mint,
      tokenProgram,
    );
    return {
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { address: assertAddress(options.payer, "payer"), isSigner: true, isWritable: true },
        { address: ata, isSigner: false, isWritable: true },
        { address: assertAddress(options.owner, "owner"), isSigner: false, isWritable: false },
        { address: assertAddress(options.mint, "mint"), isSigner: false, isWritable: false },
        { address: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { address: tokenProgram, isSigner: false, isWritable: false },
      ],
      data: Uint8Array.of(options.idempotent === false ? 0 : 1),
    };
  }

  /** Deterministic associated token account address for (owner, mint). */
  public static associatedTokenAddress(
    owner: Address,
    mint: Address,
    tokenProgram: TokenProgram = TOKEN_PROGRAM_ID,
  ): Address {
    return findProgramAddress(
      [
        addressToBytes(assertAddress(owner, "owner")),
        addressToBytes(tokenProgram),
        addressToBytes(assertAddress(mint, "mint")),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ).address;
  }

  public static memo(text: string, signers: readonly Address[] = []): Instruction {
    return {
      programId: MEMO_PROGRAM_ID,
      keys: signers.map((address) => ({ address, isSigner: true, isWritable: false })),
      data: new TextEncoder().encode(text),
    };
  }

  public static setComputeUnitLimit(units: number): Instruction {
    return {
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
      data: concatBytes(Uint8Array.of(2), encodeU32LE(units)),
    };
  }

  /** Priority fee in micro-lamports per compute unit. */
  public static setComputeUnitPrice(microLamports: bigint): Instruction {
    return {
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
      data: concatBytes(Uint8Array.of(3), encodeU64LE(microLamports)),
    };
  }

  /** Escape hatch for any program the SDK does not know about. */
  public static custom(instruction: Instruction): Instruction {
    assertAddress(instruction.programId, "programId");
    for (const key of instruction.keys) assertAddress(key.address);
    return instruction;
  }
}
