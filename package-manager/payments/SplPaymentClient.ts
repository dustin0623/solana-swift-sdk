import type { TransactionBuilder } from "../builder/TransactionBuilder";
import type { TokenClient } from "../tokens/TokenClient";
import type { Address, Commitment, Signature, TransactionStatusInfo } from "../types/index";
import type { SolanaSigner } from "../wallet/Signer";

export interface SplTransferRequest {
  mint: Address;
  /** Token owner; signs the transfer. */
  from: Address;
  /** Destination wallet — its associated token account is resolved for you. */
  to: Address;
  /** Decimal amount string, or raw base units as a bigint. */
  amount: string | bigint;
  feePayer?: Address;
  /** Create the recipient's token account when it does not exist yet. */
  createDestination?: boolean;
}

/**
 * `solana.payments.spl` — SPL token payments.
 *
 * Decimals come from the mint and the transfer is always `TransferChecked`,
 * so a wrong-decimals payment cannot be produced.
 */
export class SplPaymentClient {
  constructor(private readonly tokens: TokenClient) {}

  public transfer(request: SplTransferRequest): Promise<TransactionBuilder> {
    return this.tokens.transfer({
      mint: request.mint,
      owner: request.from,
      to: request.to,
      amount: request.amount,
      ...(request.feePayer ? { feePayer: request.feePayer } : {}),
      ...(request.createDestination !== undefined
        ? { createDestination: request.createDestination }
        : {}),
    });
  }

  public async send(
    request: SplTransferRequest & { signer: SolanaSigner; commitment?: Commitment },
  ): Promise<{ signature: Signature; status: TransactionStatusInfo }> {
    const transaction = await this.transfer(request);
    return transaction.sendAndConfirm({
      signers: [request.signer],
      ...(request.commitment ? { commitment: request.commitment } : {}),
    });
  }
}
