import { ValidationError } from "../errors/index";
import type { Address } from "../types/index";
import { addressToBytes, assertAddress } from "../utils/address";
import { base58Decode } from "../utils/base58";
import { base64Encode, concatBytes, encodeLength } from "../utils/bytes";
import type { AccountMeta, CompiledMessage, Instruction, TransactionVersion } from "./types";

interface Entry {
  address: Address;
  isSigner: boolean;
  isWritable: boolean;
}

/**
 * Compiles instructions into a wire-format Solana message.
 *
 * Supports legacy and v0 messages. v0 messages are emitted without address
 * table lookups; reading transactions that use lookup tables is fully
 * supported, writing them is not yet and is reported as unsupported rather
 * than silently degraded.
 */
export class MessageCompiler {
  public static compile(options: {
    feePayer: Address;
    recentBlockhash: string;
    instructions: readonly Instruction[];
    version?: TransactionVersion;
  }): CompiledMessage {
    const feePayer = assertAddress(options.feePayer, "feePayer");
    const version = options.version ?? 0;
    if (options.instructions.length === 0) {
      throw new ValidationError("A transaction needs at least one instruction", "instructions");
    }

    const entries = MessageCompiler.collect(feePayer, options.instructions);
    const accountKeys = entries.map((entry) => entry.address);
    const indexOf = new Map(accountKeys.map((address, index) => [address, index]));

    const numRequiredSignatures = entries.filter((entry) => entry.isSigner).length;
    const numReadonlySigned = entries.filter((e) => e.isSigner && !e.isWritable).length;
    const numReadonlyUnsigned = entries.filter((e) => !e.isSigner && !e.isWritable).length;

    const blockhash = base58Decode(options.recentBlockhash);
    if (blockhash.length !== 32) {
      throw new ValidationError("recentBlockhash must be a 32-byte base58 value", "recentBlockhash");
    }

    const instructionBytes = options.instructions.map((instruction) => {
      const programIndex = indexOf.get(assertAddress(instruction.programId, "programId"));
      if (programIndex === undefined) throw new ValidationError("Unknown program account");
      const accountIndexes = instruction.keys.map((key) => {
        const index = indexOf.get(key.address);
        if (index === undefined) throw new ValidationError(`Unknown account ${key.address}`);
        return index;
      });
      return concatBytes(
        Uint8Array.of(programIndex),
        encodeLength(accountIndexes.length),
        Uint8Array.from(accountIndexes),
        encodeLength(instruction.data.length),
        instruction.data,
      );
    });

    const core = concatBytes(
      Uint8Array.of(numRequiredSignatures, numReadonlySigned, numReadonlyUnsigned),
      encodeLength(accountKeys.length),
      ...accountKeys.map(addressToBytes),
      blockhash,
      encodeLength(options.instructions.length),
      ...instructionBytes,
    );

    const bytes =
      version === "legacy"
        ? core
        : // v0 prefix (0x80 | version) plus an empty address table lookup list.
          concatBytes(Uint8Array.of(0x80), core, encodeLength(0));

    return {
      version,
      bytes,
      accountKeys,
      numRequiredSignatures,
      recentBlockhash: options.recentBlockhash,
      feePayer,
    };
  }

  /** Assembles the wire transaction: signature array + message. */
  public static serialize(
    message: CompiledMessage,
    signatures: ReadonlyMap<Address, Uint8Array>,
  ): string {
    const signers = message.accountKeys.slice(0, message.numRequiredSignatures);
    const parts = signers.map((signer) => signatures.get(signer) ?? new Uint8Array(64));
    return base64Encode(
      concatBytes(encodeLength(parts.length), ...parts, message.bytes),
    );
  }

  private static collect(feePayer: Address, instructions: readonly Instruction[]): Entry[] {
    const map = new Map<Address, Entry>();
    const add = (meta: AccountMeta): void => {
      const address = assertAddress(meta.address);
      const existing = map.get(address);
      if (existing) {
        existing.isSigner ||= meta.isSigner;
        existing.isWritable ||= meta.isWritable;
        return;
      }
      map.set(address, { address, isSigner: meta.isSigner, isWritable: meta.isWritable });
    };

    add({ address: feePayer, isSigner: true, isWritable: true });
    for (const instruction of instructions) {
      for (const key of instruction.keys) add(key);
    }
    for (const instruction of instructions) {
      add({ address: instruction.programId, isSigner: false, isWritable: false });
    }

    const all = [...map.values()].filter((entry) => entry.address !== feePayer);
    const rank = (entry: Entry): number =>
      entry.isSigner && entry.isWritable
        ? 0
        : entry.isSigner
          ? 1
          : entry.isWritable
            ? 2
            : 3;

    return [map.get(feePayer) as Entry, ...all.sort((a, b) => rank(a) - rank(b))];
  }
}
