import type { RpcClient } from "../rpc/RpcClient";
import type { CommitmentConfig } from "../rpc/types";
import type { Address, Balance, TokenBalance } from "../types/index";
import { assertAddress, TOKEN_PROGRAM_ID } from "../utils/address";
import { fromBaseUnits, lamportsToSol } from "../utils/amount";

/** Native SOL and SPL token balances, always as exact integers. */
export class BalanceReader {
  constructor(private readonly rpc: RpcClient) {}

  public async sol(address: Address, config?: CommitmentConfig): Promise<Balance> {
    const response = await this.rpc.getBalance(assertAddress(address), config);
    const lamports = BigInt(response.value);
    return {
      address,
      lamports,
      sol: lamportsToSol(lamports),
      context: { slot: response.context.slot },
    };
  }

  /** Balance of a specific token account (not an owner wallet). */
  public async tokenAccount(
    tokenAccount: Address,
    config?: CommitmentConfig,
  ): Promise<TokenBalance> {
    const response = await this.rpc.getTokenAccountBalance(assertAddress(tokenAccount), config);
    return {
      address: tokenAccount,
      mint: "",
      owner: null,
      amount: {
        amount: response.value.amount,
        decimals: response.value.decimals,
        uiAmount: fromBaseUnits(BigInt(response.value.amount), response.value.decimals),
      },
      raw: response,
    };
  }

  /** Every token account an owner holds, optionally filtered to one mint. */
  public async tokens(
    owner: Address,
    options: { mint?: Address; programId?: Address } & CommitmentConfig = {},
  ): Promise<TokenBalance[]> {
    const { mint, programId, ...config } = options;
    const filter = mint
      ? { mint: assertAddress(mint, "mint") }
      : { programId: programId ?? TOKEN_PROGRAM_ID };

    const response = await this.rpc.getTokenAccountsByOwner(
      assertAddress(owner, "owner"),
      filter,
      config,
    );

    return response.value.map((entry) => {
      const parsed = (entry.account.data as { parsed?: { info?: Record<string, unknown> } }).parsed;
      const info = (parsed?.info ?? {}) as {
        mint?: string;
        owner?: string;
        tokenAmount?: { amount: string; decimals: number };
      };
      const amount = info.tokenAmount?.amount ?? "0";
      const decimals = info.tokenAmount?.decimals ?? 0;
      return {
        address: entry.pubkey as Address,
        mint: (info.mint ?? "") as Address,
        owner: (info.owner ?? owner) as Address,
        amount: { amount, decimals, uiAmount: fromBaseUnits(BigInt(amount), decimals) },
        raw: entry,
      };
    });
  }
}
