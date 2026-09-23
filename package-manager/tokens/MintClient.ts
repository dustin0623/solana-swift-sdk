import { ValidationError } from "../errors/index";
import type { RpcClient } from "../rpc/RpcClient";
import type { CommitmentConfig } from "../rpc/types";
import type { Address, MintInfo } from "../types/index";
import { assertAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address";
import { fromBaseUnits } from "../utils/amount";

interface ParsedMint {
  decimals?: number;
  supply?: string;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  isInitialized?: boolean;
}

/**
 * Mint reads.
 *
 * Classic SPL Token and Token-2022 mints are both readable, and the program
 * that owns the mint is reported explicitly — they are separate programs with
 * different extension behaviour, never assumed identical.
 */
export class MintClient {
  private readonly cache = new Map<Address, MintInfo>();

  constructor(private readonly rpc: RpcClient) {}

  public async get(mint: Address, config?: CommitmentConfig): Promise<MintInfo> {
    const address = assertAddress(mint, "mint");
    const cached = this.cache.get(address);
    if (cached) return cached;

    const response = await this.rpc.getParsedAccountInfo(address, config);
    const account = response.value;
    if (!account) throw new ValidationError(`Mint ${address} does not exist`, "mint");

    const owner = account.owner;
    if (owner !== TOKEN_PROGRAM_ID && owner !== TOKEN_2022_PROGRAM_ID) {
      throw new ValidationError(`${address} is not owned by a token program`, "mint");
    }

    const data = account.data as { parsed?: { type?: string; info?: ParsedMint } };
    const info = data.parsed?.info;
    if (data.parsed?.type !== "mint" || !info || info.decimals === undefined) {
      throw new ValidationError(`${address} is not a mint account`, "mint");
    }

    const result: MintInfo = {
      address,
      decimals: info.decimals,
      supply: info.supply ?? "0",
      mintAuthority: (info.mintAuthority ?? null) as Address | null,
      freezeAuthority: (info.freezeAuthority ?? null) as Address | null,
      isInitialized: info.isInitialized ?? true,
      program: owner === TOKEN_2022_PROGRAM_ID ? "spl-token-2022" : "spl-token",
      raw: account,
    };
    this.cache.set(address, result);
    return result;
  }

  /** Total supply as raw units plus a decimal string. */
  public async supply(
    mint: Address,
    config?: CommitmentConfig,
  ): Promise<{ amount: string; decimals: number; uiAmount: string }> {
    const response = await this.rpc.getTokenSupply(assertAddress(mint, "mint"), config);
    return {
      amount: response.value.amount,
      decimals: response.value.decimals,
      uiAmount: fromBaseUnits(BigInt(response.value.amount), response.value.decimals),
    };
  }

  public async largestAccounts(
    mint: Address,
    config?: CommitmentConfig,
  ): Promise<Array<{ address: Address; amount: string; uiAmount: string }>> {
    const response = await this.rpc.getTokenLargestAccounts(assertAddress(mint, "mint"), config);
    return response.value.map((entry) => ({
      address: entry.address as Address,
      amount: entry.amount,
      uiAmount: fromBaseUnits(BigInt(entry.amount), entry.decimals),
    }));
  }

  /** Clears the mint cache (decimals/authorities can change on chain). */
  public clearCache(): void {
    this.cache.clear();
  }
}
