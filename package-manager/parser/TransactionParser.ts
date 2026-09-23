import type { RpcTransaction } from "../rpc/types.js";
import type { Address, ParsedInstruction, ParsedTransaction } from "../types/index.js";
import { InstructionParser } from "./InstructionParser.js";
import { LogParser } from "./LogParser.js";
import { TokenTransferParser } from "./TokenTransferParser.js";
import { TransferParser } from "./TransferParser.js";

/**
 * Normalises a `getTransaction` response into one consistent shape.
 *
 * Legacy and versioned transactions are both supported, and addresses loaded
 * through address lookup tables are appended to `accountKeys` in the order the
 * runtime uses (static keys, writable lookups, readonly lookups) so that
 * index-based instructions resolve correctly.
 */
export class TransactionParser {
  public static parse(signature: string, response: RpcTransaction): ParsedTransaction {
    const meta = response.meta;
    const message = response.transaction.message;
    const accountKeys = TransactionParser.accountKeys(response);
    const logs = meta?.logMessages ?? [];

    const innerByIndex = new Map<number, ParsedInstruction[]>();
    for (const group of meta?.innerInstructions ?? []) {
      innerByIndex.set(
        group.index,
        group.instructions.map((instruction, position) =>
          InstructionParser.parse(instruction, accountKeys, group.index, []),
        ),
      );
    }

    const instructions = message.instructions.map((instruction, index) =>
      InstructionParser.parse(instruction, accountKeys, index, innerByIndex.get(index) ?? []),
    );

    const programs = unique([
      ...instructions.flatMap((instruction) => [
        instruction.programId,
        ...instruction.inner.map((child) => child.programId),
      ]),
      ...LogParser.programs(logs),
    ]).filter((programId) => programId !== "");

    return {
      signature: response.transaction.signatures[0] ?? signature,
      slot: response.slot,
      blockTime: response.blockTime ?? null,
      success: !meta?.err,
      error: meta?.err ?? null,
      fee: BigInt(meta?.fee ?? 0),
      version: response.version ?? "legacy",
      feePayer: accountKeys[0] ?? null,
      accountKeys,
      transfers: TransferParser.fromInstructions(instructions),
      tokenTransfers: TokenTransferParser.fromInstructions(
        instructions,
        [...(meta?.preTokenBalances ?? []), ...(meta?.postTokenBalances ?? [])],
        accountKeys,
      ),
      instructions,
      programs,
      logs: [...logs],
      raw: response,
    };
  }

  /** Static keys plus lookup-table addresses, in runtime order. */
  public static accountKeys(response: RpcTransaction): Address[] {
    const raw = response.transaction.message.accountKeys ?? [];
    const statik = raw.map((entry) =>
      typeof entry === "string" ? (entry as Address) : (entry.pubkey as Address),
    );

    const loaded = response.meta?.loadedAddresses;
    if (!loaded) return statik;

    const extra = [...(loaded.writable ?? []), ...(loaded.readonly ?? [])] as Address[];
    // jsonParsed already appends loaded addresses; avoid duplicating them.
    const known = new Set(statik);
    return [...statik, ...extra.filter((address) => !known.has(address))];
  }

  /** True when the transaction used address lookup tables. */
  public static usesLookupTables(response: RpcTransaction): boolean {
    const lookups = response.transaction.message.addressTableLookups ?? [];
    const loaded = response.meta?.loadedAddresses;
    return (
      lookups.length > 0 ||
      (loaded ? loaded.writable.length + loaded.readonly.length > 0 : false)
    );
  }
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
