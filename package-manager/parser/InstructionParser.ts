import type { RpcInstruction } from "../rpc/types";
import type { Address, ParsedInstruction } from "../types/index";
import { programName } from "../utils/address";

interface ParsedPayload {
  type?: string;
  info?: unknown;
}

/**
 * Normalises a single instruction from either encoding the RPC can return:
 * `jsonParsed` (program known to the node) or index-based `json`.
 */
export class InstructionParser {
  public static parse(
    instruction: RpcInstruction,
    accountKeys: readonly Address[],
    index: number,
    inner: ParsedInstruction[] = [],
  ): ParsedInstruction {
    const programId =
      instruction.programId ??
      (typeof instruction.programIdIndex === "number"
        ? accountKeys[instruction.programIdIndex]
        : undefined) ??
      "";

    const accounts = (instruction.accounts ?? []).map((account) =>
      typeof account === "number" ? (accountKeys[account] ?? String(account)) : String(account),
    );

    const parsed = instruction.parsed as ParsedPayload | string | undefined;
    const type = typeof parsed === "object" && parsed !== null ? (parsed.type ?? null) : null;
    const info = typeof parsed === "object" && parsed !== null ? (parsed.info ?? null) : (parsed ?? null);

    return {
      index,
      programId,
      program: instruction.program ?? programName(programId),
      type,
      accounts,
      data: instruction.data ?? null,
      info,
      inner,
    };
  }

  /** Flattens top-level and inner instructions into one ordered list. */
  public static flatten(instructions: readonly ParsedInstruction[]): ParsedInstruction[] {
    const out: ParsedInstruction[] = [];
    for (const instruction of instructions) {
      out.push(instruction);
      out.push(...InstructionParser.flatten(instruction.inner));
    }
    return out;
  }
}
