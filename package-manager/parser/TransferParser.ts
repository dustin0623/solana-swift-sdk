import type { Address, ParsedInstruction, SolTransfer } from "../types/index.js";
import { SYSTEM_PROGRAM_ID } from "../utils/address.js";
import { lamportsToSol } from "../utils/amount.js";

interface SystemTransferInfo {
  source?: string;
  destination?: string;
  lamports?: number | string;
  newAccount?: string;
  funding?: string;
}

const TRANSFER_TYPES = new Set(["transfer", "transferWithSeed", "createAccount", "createAccountWithSeed"]);

/**
 * Extracts native SOL movements from System Program instructions.
 *
 * Only movements the System Program itself performed are reported. Lamport
 * changes caused by arbitrary program logic are not guessed at — use the
 * balance deltas on the raw metadata for those.
 */
export class TransferParser {
  public static fromInstructions(
    instructions: readonly ParsedInstruction[],
    inner = false,
  ): SolTransfer[] {
    const out: SolTransfer[] = [];
    for (const instruction of instructions) {
      if (
        instruction.programId === SYSTEM_PROGRAM_ID &&
        instruction.type &&
        TRANSFER_TYPES.has(instruction.type)
      ) {
        const info = (instruction.info ?? {}) as SystemTransferInfo;
        const source = info.source ?? info.funding;
        const destination = info.destination ?? info.newAccount;
        if (source && destination && info.lamports !== undefined) {
          const lamports = BigInt(info.lamports);
          out.push({
            source: source as Address,
            destination: destination as Address,
            lamports,
            sol: lamportsToSol(lamports),
            instructionIndex: instruction.index,
            inner,
          });
        }
      }
      out.push(...TransferParser.fromInstructions(instruction.inner, true));
    }
    return out;
  }

  /** Net lamport change per account, straight from pre/post balances. */
  public static balanceDeltas(
    accountKeys: readonly Address[],
    preBalances: readonly number[],
    postBalances: readonly number[],
  ): Array<{ address: Address; change: bigint }> {
    const out: Array<{ address: Address; change: bigint }> = [];
    accountKeys.forEach((address, index) => {
      const pre = preBalances[index];
      const post = postBalances[index];
      if (pre === undefined || post === undefined) return;
      const change = BigInt(post) - BigInt(pre);
      if (change !== 0n) out.push({ address, change });
    });
    return out;
  }
}
