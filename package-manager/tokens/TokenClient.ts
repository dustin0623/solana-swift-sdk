import type { BuilderClient } from "../builder/BuilderClient.js";
import { InstructionBuilder } from "../builder/InstructionBuilder.js";
import type { TransactionBuilder } from "../builder/TransactionBuilder.js";
import type { ReaderClient } from "../reader/ReaderClient.js";
import type { Address, MintInfo, TokenBalance } from "../types/index.js";
import { assertAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address.js";
import { fromBaseUnits, toBaseUnits } from "../utils/amount.js";
import { MintClient } from "./MintClient.js";
import { TransferClient, type TokenTransferRequest } from "./TransferClient.js";

/**
 * `solana.tokens` — SPL token reads and transaction builders.
 *
 * Every builder returns an unsent TransactionBuilder: nothing is broadcast
 * until the application calls `send()` with explicit signers.
 */
export class TokenClient {
  public readonly mints: MintClient;
  public readonly transfers: TransferClient;

  constructor(
    private readonly reader: ReaderClient,
    private readonly builder: BuilderClient,
    mints: MintClient,
  ) {
    this.mints = mints;
    this.transfers = new TransferClient(builder, mints);
  }


  public getMint(mint: Address): Promise<MintInfo> {
    return this.mints.get(mint);
  }

  /** Associated token account address for an owner and mint. */
  public async associatedAddress(owner: Address, mint: Address): Promise<Address> {
    const info = await this.mints.get(mint);
    return InstructionBuilder.associatedTokenAddress(
      owner,
      mint,
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    );
  }

  /** Token balance for an owner of a specific mint. Zero when no account. */
  public async getBalance(
    owner: Address,
    mint: Address,
  ): Promise<{ amount: string; decimals: number; uiAmount: string }> {
    const info = await this.mints.get(mint);
    const accounts = await this.reader.tokenBalances(owner, { mint });
    const total = accounts.reduce((sum, account) => sum + BigInt(account.amount.amount), 0n);
    return {
      amount: total.toString(),
      decimals: info.decimals,
      uiAmount: fromBaseUnits(total, info.decimals),
    };
  }

  public accounts(owner: Address, mint?: Address): Promise<TokenBalance[]> {
    return this.reader.tokenBalances(owner, mint ? { mint } : undefined);
  }

  public transfer(request: TokenTransferRequest): Promise<TransactionBuilder> {
    return this.transfers.build(request);
  }

  /** Mints new units. The caller must sign as the mint authority. */
  public async mint(options: {
    mint: Address;
    to: Address;
    authority: Address;
    amount: string | bigint;
    feePayer?: Address;
  }): Promise<TransactionBuilder> {
    const info = await this.mints.get(options.mint);
    const tokenProgram =
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const feePayer = assertAddress(options.feePayer ?? options.authority, "feePayer");
    const destination = InstructionBuilder.associatedTokenAddress(
      options.to,
      info.address,
      tokenProgram,
    );
    const amount =
      typeof options.amount === "bigint"
        ? options.amount
        : toBaseUnits(options.amount, info.decimals);

    return this.builder
      .create()
      .feePayer(feePayer)
      .add(
        InstructionBuilder.createAssociatedTokenAccount({
          payer: feePayer,
          owner: options.to,
          mint: info.address,
          programId: tokenProgram,
          idempotent: true,
        }),
        InstructionBuilder.mintTo({
          mint: info.address,
          destination,
          authority: options.authority,
          amount,
          programId: tokenProgram,
        }),
      );
  }

  /** Burns units from the owner's associated token account. */
  public async burn(options: {
    mint: Address;
    owner: Address;
    amount: string | bigint;
    feePayer?: Address;
  }): Promise<TransactionBuilder> {
    const info = await this.mints.get(options.mint);
    const tokenProgram =
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const account = InstructionBuilder.associatedTokenAddress(
      options.owner,
      info.address,
      tokenProgram,
    );
    const amount =
      typeof options.amount === "bigint"
        ? options.amount
        : toBaseUnits(options.amount, info.decimals);

    return this.builder
      .create()
      .feePayer(assertAddress(options.feePayer ?? options.owner, "feePayer"))
      .add(
        InstructionBuilder.burn({
          account,
          mint: info.address,
          authority: options.owner,
          amount,
          programId: tokenProgram,
        }),
      );
  }
}
