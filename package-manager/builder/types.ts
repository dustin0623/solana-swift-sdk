import type { Address } from "../types/index";

export interface AccountMeta {
  address: Address;
  isSigner: boolean;
  isWritable: boolean;
}

/** A single instruction, before it is compiled into a message. */
export interface Instruction {
  programId: Address;
  keys: AccountMeta[];
  data: Uint8Array;
}

export type TransactionVersion = "legacy" | 0;

export interface CompiledMessage {
  version: TransactionVersion;
  /** Wire-format message bytes — what signers actually sign. */
  bytes: Uint8Array;
  accountKeys: Address[];
  numRequiredSignatures: number;
  recentBlockhash: string;
  feePayer: Address;
}

/** A message plus the signatures collected so far. */
export interface BuiltTransaction {
  message: CompiledMessage;
  signatures: Map<Address, Uint8Array>;
  /** Base64 wire transaction, with missing signatures zero-filled. */
  serialize(): string;
  /** True once every required signer has signed. */
  isFullySigned(): boolean;
}
