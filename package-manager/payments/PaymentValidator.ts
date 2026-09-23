import { ValidationError } from "../errors/index";
import type { TransactionReader } from "../reader/TransactionReader";
import type {
  Address,
  Commitment,
  ParsedTransaction,
  Signature,
} from "../types/index";
import { solToLamports, toBaseUnits } from "../utils/amount";
import type { MintClient } from "../tokens/MintClient";

export interface PaymentExpectation {
  /** Required recipient. */
  to: Address;
  /** Required sender. Optional, but recommended for order attribution. */
  from?: Address;
  /** Decimal amount string ("1.5") or raw base units as a bigint. */
  amount: string | bigint;
  /** Omit for native SOL; supply the mint for an SPL token payment. */
  mint?: Address;
  /**
   * Exact match by default. "atLeast" accepts overpayment, which is often what
   * a checkout wants.
   */
  match?: "exact" | "atLeast";
  /** Optional memo that must appear in the transaction logs. */
  memo?: string;
}

export interface PaymentValidationRequest {
  signature: Signature;
  expected: PaymentExpectation;
  /** Confirmation level the payment must have reached. Default "finalized". */
  commitment?: Commitment;
}

export interface PaymentValidationResult {
  valid: boolean;
  /** Empty when valid; otherwise one entry per failed check. */
  reasons: string[];
  signature: Signature;
  /** Amount actually received by the expected recipient, in base units. */
  receivedAmount: string | null;
  transaction: ParsedTransaction | null;
}

const ORDER: Record<Commitment, number> = { processed: 0, confirmed: 1, finalized: 2 };

/**
 * Verifies that a payment really happened on chain.
 *
 * A signature alone proves nothing, so every field is re-checked against the
 * transaction the node returns: success, recipient, sender, mint, amount and
 * confirmation level. Amounts are compared in integer base units.
 */
export class PaymentValidator {
  constructor(
    private readonly transactions: TransactionReader,
    private readonly mints: MintClient,
  ) {}

  public async validate(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    const commitment = request.commitment ?? "finalized";
    const reasons: string[] = [];

    const transaction = await this.transactions.get(request.signature, { commitment });
    if (!transaction) {
      return {
        valid: false,
        reasons: [`Transaction not found at ${commitment} commitment`],
        signature: request.signature,
        receivedAmount: null,
        transaction: null,
      };
    }

    if (!transaction.success) reasons.push("Transaction failed on chain");

    const status = await this.transactions.status(request.signature);
    const reached = status?.confirmationStatus
      ? ORDER[status.confirmationStatus] >= ORDER[commitment]
      : false;
    if (!reached) {
      reasons.push(
        `Transaction has not reached ${commitment} commitment (currently ${
          status?.confirmationStatus ?? "unknown"
        })`,
      );
    }

    const expected = request.expected;
    const match = expected.match ?? "exact";
    const received = expected.mint
      ? await this.tokenAmount(transaction, expected)
      : this.solAmount(transaction, expected);

    const expectedUnits = expected.mint
      ? typeof expected.amount === "bigint"
        ? expected.amount
        : toBaseUnits(expected.amount, (await this.mints.get(expected.mint)).decimals)
      : typeof expected.amount === "bigint"
        ? expected.amount
        : solToLamports(expected.amount);

    if (received === null) {
      reasons.push(
        expected.mint
          ? `No SPL transfer of mint ${expected.mint} to ${expected.to} found`
          : `No SOL transfer to ${expected.to} found`,
      );
    } else if (match === "exact" ? received !== expectedUnits : received < expectedUnits) {
      reasons.push(
        `Amount mismatch: expected ${match === "exact" ? "" : "at least "}${expectedUnits} base units, received ${received}`,
      );
    }

    if (expected.memo && !transaction.logs.some((line) => line.includes(expected.memo as string))) {
      reasons.push(`Memo "${expected.memo}" not present in transaction logs`);
    }

    return {
      valid: reasons.length === 0,
      reasons,
      signature: request.signature,
      receivedAmount: received === null ? null : received.toString(),
      transaction,
    };
  }

  /** Throws instead of returning a result. Convenient in server handlers. */
  public async assertValid(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    const result = await this.validate(request);
    if (!result.valid) {
      throw new ValidationError(`Payment validation failed: ${result.reasons.join("; ")}`);
    }
    return result;
  }

  private solAmount(transaction: ParsedTransaction, expected: PaymentExpectation): bigint | null {
    const matches = transaction.transfers.filter(
      (transfer) =>
        transfer.destination === expected.to &&
        (!expected.from || transfer.source === expected.from),
    );
    if (matches.length === 0) return null;
    return matches.reduce((sum, transfer) => sum + transfer.lamports, 0n);
  }

  private async tokenAmount(
    transaction: ParsedTransaction,
    expected: PaymentExpectation,
  ): Promise<bigint | null> {
    const mint = expected.mint as Address;
    const info = await this.mints.get(mint);
    const destination = await this.associated(expected.to, mint, info.program);

    const matches = transaction.tokenTransfers.filter((transfer) => {
      const mintMatches = transfer.mint === null || transfer.mint === mint;
      const toMatches = transfer.destination === destination || transfer.destination === expected.to;
      const fromMatches =
        !expected.from ||
        transfer.authority === expected.from ||
        transfer.source === expected.from;
      return mintMatches && toMatches && fromMatches;
    });
    if (matches.length === 0) return null;
    return matches.reduce((sum, transfer) => sum + BigInt(transfer.amount), 0n);
  }

  private async associated(
    owner: Address,
    mint: Address,
    program: "spl-token" | "spl-token-2022",
  ): Promise<Address> {
    const { InstructionBuilder } = await import("../builder/InstructionBuilder");
    const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } = await import("../utils/address");
    return InstructionBuilder.associatedTokenAddress(
      owner,
      mint,
      program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    );
  }
}
