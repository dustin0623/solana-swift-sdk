import type { RpcTokenBalance } from "../rpc/types.js";
import type { Address, ParsedInstruction, SplTransfer } from "../types/index.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address.js";
import { fromBaseUnits } from "../utils/amount.js";

interface TokenInstructionInfo {
  source?: string;
  destination?: string;
  authority?: string;
  multisigAuthority?: string;
  mint?: string;
  amount?: string;
  tokenAmount?: { amount: string; decimals: number };
}

const TRANSFER_TYPES = new Set(["transfer", "transferChecked"]);

/**
 * Extracts SPL token movements.
 *
 * Classic SPL Token and Token-2022 are handled separately on purpose: they are
 * different programs and are never treated as interchangeable. Plain
 * `transfer` carries no mint or decimals, so those are resolved from the
 * transaction's token balance metadata when available, and left null when not.
 */
export class TokenTransferParser {
  public static fromInstructions(
    instructions: readonly ParsedInstruction[],
    tokenBalances: readonly RpcTokenBalance[] = [],
    accountKeys: readonly Address[] = [],
    inner = false,
  ): SplTransfer[] {
    const out: SplTransfer[] = [];
    const mintByAccount = TokenTransferParser.mintIndex(tokenBalances, accountKeys);

    for (const instruction of instructions) {
      const isTokenProgram =
        instruction.programId === TOKEN_PROGRAM_ID ||
        instruction.programId === TOKEN_2022_PROGRAM_ID;

      if (isTokenProgram && instruction.type && TRANSFER_TYPES.has(instruction.type)) {
        const info = (instruction.info ?? {}) as TokenInstructionInfo;
        const source = info.source;
        const destination = info.destination;
        if (source && destination) {
          const checked = info.tokenAmount;
          const amount = checked?.amount ?? info.amount ?? "0";
          const mint = info.mint ?? mintByAccount.get(source) ?? mintByAccount.get(destination) ?? null;
          const decimals =
            checked?.decimals ??
            TokenTransferParser.decimalsFor(tokenBalances, accountKeys, source, destination);

          out.push({
            mint: (mint as Address | null) ?? null,
            source: source as Address,
            destination: destination as Address,
            authority: (info.authority ?? info.multisigAuthority ?? null) as Address | null,
            amount,
            decimals,
            uiAmount: decimals === null ? null : fromBaseUnits(BigInt(amount), decimals),
            instructionIndex: instruction.index,
            inner,
          });
        }
      }

      out.push(
        ...TokenTransferParser.fromInstructions(
          instruction.inner,
          tokenBalances,
          accountKeys,
          true,
        ),
      );
    }
    return out;
  }

  /** Net token balance change per (account, mint), from pre/post metadata. */
  public static balanceDeltas(
    pre: readonly RpcTokenBalance[],
    post: readonly RpcTokenBalance[],
    accountKeys: readonly Address[],
  ): Array<{ address: Address | null; mint: Address; change: string; decimals: number }> {
    const key = (entry: RpcTokenBalance): string => `${entry.accountIndex}:${entry.mint}`;
    const preMap = new Map(pre.map((entry) => [key(entry), entry]));
    const seen = new Set<string>();
    const out: Array<{ address: Address | null; mint: Address; change: string; decimals: number }> = [];

    for (const entry of post) {
      seen.add(key(entry));
      const before = preMap.get(key(entry));
      const change = BigInt(entry.uiTokenAmount.amount) - BigInt(before?.uiTokenAmount.amount ?? "0");
      if (change === 0n) continue;
      out.push({
        address: accountKeys[entry.accountIndex] ?? null,
        mint: entry.mint as Address,
        change: change.toString(),
        decimals: entry.uiTokenAmount.decimals,
      });
    }

    for (const entry of pre) {
      if (seen.has(key(entry))) continue;
      const change = -BigInt(entry.uiTokenAmount.amount);
      if (change === 0n) continue;
      out.push({
        address: accountKeys[entry.accountIndex] ?? null,
        mint: entry.mint as Address,
        change: change.toString(),
        decimals: entry.uiTokenAmount.decimals,
      });
    }

    return out;
  }

  private static mintIndex(
    balances: readonly RpcTokenBalance[],
    accountKeys: readonly Address[],
  ): Map<string, string> {
    const map = new Map<string, string>();
    for (const balance of balances) {
      const address = accountKeys[balance.accountIndex];
      if (address) map.set(address, balance.mint);
    }
    return map;
  }

  private static decimalsFor(
    balances: readonly RpcTokenBalance[],
    accountKeys: readonly Address[],
    source: string,
    destination: string,
  ): number | null {
    for (const balance of balances) {
      const address = accountKeys[balance.accountIndex];
      if (address === source || address === destination) return balance.uiTokenAmount.decimals;
    }
    return null;
  }
}
