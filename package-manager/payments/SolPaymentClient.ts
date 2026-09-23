import type { BuilderClient } from "../builder/BuilderClient.js";
import type { TransactionBuilder } from "../builder/TransactionBuilder.js";
import type { Address, Signature, TransactionStatusInfo, Commitment } from "../types/index.js";
import { assertAddress } from "../utils/address.js";
import { solToLamports } from "../utils/amount.js";
import type { SolanaSigner } from "../wallet/Signer.js";

export interface SolTransferRequest {
  from: Address;
  to: Address;
  /** Decimal SOL string, e.g. "0.1". Floats are never used internally. */
  amount: string | bigint;
  memo?: string;
  /** Micro-lamports per compute unit. */
  priorityFee?: bigint;
}

/**
 * `solana.payments.sol` — native SOL payments.
 *
 * `transfer()` returns an unsent builder. Broadcasting always requires an
 * explicit `send()` or `sendAndConfirm()` call with signers.
 */
export class SolPaymentClient {
  constructor(private readonly builder: BuilderClient) {}

  public transfer(request: SolTransferRequest): TransactionBuilder {
    const from = assertAddress(request.from, "from");
    const transaction = this.builder
      .create()
      .feePayer(from)
      .transfer({
        from,
        to: assertAddress(request.to, "to"),
        lamports:
          typeof request.amount === "bigint" ? request.amount : solToLamports(request.amount),
      });

    if (request.priorityFee !== undefined) transaction.priorityFee(request.priorityFee);
    if (request.memo) transaction.memo(request.memo);
    return transaction;
  }

  /** Builds, signs, broadcasts once and waits for confirmation. */
  public send(
    request: SolTransferRequest & {
      signer: SolanaSigner;
      commitment?: Commitment;
    },
  ): Promise<{ signature: Signature; status: TransactionStatusInfo }> {
    return this.transfer(request).sendAndConfirm({
      signers: [request.signer],
      ...(request.commitment ? { commitment: request.commitment } : {}),
    });
  }
}
