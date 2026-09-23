import { TransactionError } from "../errors/index";
import type { RpcClient } from "../rpc/RpcClient";
import type { Commitment, Signature, TransactionStatusInfo } from "../types/index";

const ORDER: Record<Commitment, number> = { processed: 0, confirmed: 1, finalized: 2 };

export interface ConfirmOptions {
  commitment?: Commitment;
  /** How long to poll before giving up. Default 60s. */
  timeoutMs?: number;
  pollIntervalMs?: number;
  /** Stop early once this block height passes the blockhash validity window. */
  lastValidBlockHeight?: number;
}

/**
 * Polls signature status until the requested commitment is reached.
 *
 * Polling never rebroadcasts, so confirmation can't duplicate a transaction.
 * A timeout means "not yet observed", not "failed" — the caller decides.
 */
export async function confirmSignature(
  rpc: RpcClient,
  signature: Signature,
  options: ConfirmOptions = {},
): Promise<TransactionStatusInfo> {
  const target = options.commitment ?? "confirmed";
  const timeoutMs = options.timeoutMs ?? 60_000;
  const interval = options.pollIntervalMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const status = await rpc.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (status) {
      if (status.err) {
        throw new TransactionError("Transaction failed on chain", {
          signature,
          cause: status.err,
        });
      }
      const reached = status.confirmationStatus
        ? ORDER[status.confirmationStatus] >= ORDER[target]
        : false;
      if (reached) {
        return {
          slot: status.slot,
          confirmations: status.confirmations ?? null,
          confirmationStatus: status.confirmationStatus ?? null,
          err: null,
        };
      }
    }

    if (options.lastValidBlockHeight !== undefined) {
      const height = await rpc.getBlockHeight({ commitment: "confirmed" });
      if (height > options.lastValidBlockHeight) {
        throw new TransactionError(
          "Blockhash expired before the transaction was confirmed; it will never land",
          { signature },
        );
      }
    }

    if (Date.now() >= deadline) {
      throw new TransactionError(
        `Transaction was not ${target} within ${timeoutMs}ms. It may still land — re-check the signature before resending.`,
        { signature },
      );
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
