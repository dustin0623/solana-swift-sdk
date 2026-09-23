import type { AccountReader } from "../reader/AccountReader";
import type { RpcClient } from "../rpc/RpcClient";
import type { CommitmentConfig, RpcKeyedAccount } from "../rpc/types";
import type { AccountInfo, Address } from "../types/index";
import { assertAddress } from "../utils/address";
import { findProgramAddress, type Pda, type PdaSeed } from "../utils/pda";
import { AccountReader as Reader } from "../reader/AccountReader";
import type { Instruction, AccountMeta } from "../builder/types";

/**
 * `solana.programs` — generic program access.
 *
 * Deliberately knows nothing about any specific application program: it works
 * with program ids, accounts, filters, PDAs and raw instruction data.
 */
export class ProgramClient {
  constructor(
    private readonly rpc: RpcClient,
    private readonly accounts: AccountReader,
  ) {}

  /** Derives the canonical PDA for a set of seeds. */
  public pda(seeds: readonly PdaSeed[], programId: Address): Pda {
    return findProgramAddress(seeds, programId);
  }

  /** All accounts owned by a program. Use filters — this is an expensive call. */
  public async accountsOf(
    programId: Address,
    options: CommitmentConfig & {
      filters?: readonly unknown[];
      dataSize?: number;
      dataSlice?: { offset: number; length: number };
    } = {},
  ): Promise<Array<AccountInfo & { address: Address }>> {
    const { dataSize, filters, ...config } = options;
    const combined = [
      ...(dataSize !== undefined ? [{ dataSize }] : []),
      ...(filters ?? []),
    ];
    const response = await this.rpc.getProgramAccounts(assertAddress(programId, "programId"), {
      ...config,
      ...(combined.length > 0 ? { filters: combined } : {}),
    });
    const entries = (Array.isArray(response) ? response : response.value) as RpcKeyedAccount[];
    return entries.map((entry) => Reader.normalizeKeyed(entry));
  }

  /** True when the address is an executable program account. */
  public async isProgram(address: Address): Promise<boolean> {
    const account = await this.accounts.get(address);
    return account?.executable ?? false;
  }

  /** Builds an instruction for any program the SDK does not model. */
  public instruction(options: {
    programId: Address;
    keys: AccountMeta[];
    data: Uint8Array;
  }): Instruction {
    return {
      programId: assertAddress(options.programId, "programId"),
      keys: options.keys.map((key) => ({ ...key, address: assertAddress(key.address) })),
      data: options.data,
    };
  }
}
