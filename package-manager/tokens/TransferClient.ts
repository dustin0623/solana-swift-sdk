import type { BuilderClient } from "../builder/BuilderClient";
import { InstructionBuilder } from "../builder/InstructionBuilder";
import type { TransactionBuilder } from "../builder/TransactionBuilder";
import { ValidationError } from "../errors/index";
import type { Address } from "../types/index";
import { assertAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address";
import { toBaseUnits } from "../utils/amount";
import type { MintClient } from "./MintClient";

export interface TokenTransferRequest {
  mint: Address;
  /** Owner of the source token account; must sign. */
  owner: Address;
  /** Destination wallet. Its associated token account is used. */
  to: Address;
  /** Decimal amount as a string, or raw base units as a bigint. */
  amount: string | bigint;
  /** Pays fees and any account creation rent. Defaults to `owner`. */
  feePayer?: Address;
  /** Create the destination associated token account when missing. */
  createDestination?: boolean;
}

/**
 * Builds SPL token transfers.
 *
 * Always uses `TransferChecked`, so the mint and decimals are verified on
 * chain. Decimals are read from the mint — never assumed to be 6 or 9.
 */
export class TransferClient {
  constructor(
    private readonly builder: BuilderClient,
    private readonly mints: MintClient,
  ) {}

  public async build(request: TokenTransferRequest): Promise<TransactionBuilder> {
    const mint = await this.mints.get(request.mint);
    const owner = assertAddress(request.owner, "owner");
    const to = assertAddress(request.to, "to");
    const feePayer = assertAddress(request.feePayer ?? owner, "feePayer");

    const amount =
      typeof request.amount === "bigint"
        ? request.amount
        : toBaseUnits(request.amount, mint.decimals);
    if (amount <= 0n) throw new ValidationError("Transfer amount must be positive", "amount");

    const tokenProgram =
      mint.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const source = InstructionBuilder.associatedTokenAddress(owner, mint.address, tokenProgram);
    const destination = InstructionBuilder.associatedTokenAddress(to, mint.address, tokenProgram);

    const transaction = this.builder.create().feePayer(feePayer);
    if (request.createDestination !== false) {
      transaction.add(
        InstructionBuilder.createAssociatedTokenAccount({
          payer: feePayer,
          owner: to,
          mint: mint.address,
          programId: tokenProgram,
          idempotent: true,
        }),
      );
    }
    transaction.add(
      InstructionBuilder.transferTokensChecked({
        source,
        mint: mint.address,
        destination,
        authority: owner,
        amount,
        decimals: mint.decimals,
        programId: tokenProgram,
      }),
    );
    return transaction;
  }
}
