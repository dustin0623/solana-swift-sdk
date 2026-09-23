import type { BuilderClient } from "../builder/BuilderClient";
import type { TransactionReader } from "../reader/TransactionReader";
import type { MintClient } from "../tokens/MintClient";
import type { TokenClient } from "../tokens/TokenClient";
import {
  PaymentValidator,
  type PaymentValidationRequest,
  type PaymentValidationResult,
} from "./PaymentValidator";
import { SolPaymentClient } from "./SolPaymentClient";
import { SplPaymentClient } from "./SplPaymentClient";

/**
 * `solana.payments` — payment building and on-chain verification.
 */
export class PaymentClient {
  public readonly sol: SolPaymentClient;
  public readonly spl: SplPaymentClient;
  public readonly validator: PaymentValidator;

  constructor(options: {
    builder: BuilderClient;
    tokens: TokenClient;
    transactions: TransactionReader;
    mints: MintClient;
  }) {
    this.sol = new SolPaymentClient(options.builder);
    this.spl = new SplPaymentClient(options.tokens);
    this.validator = new PaymentValidator(options.transactions, options.mints);
  }

  /** Verifies a payment against the chain. Never trusts client-supplied data. */
  public validate(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    return this.validator.validate(request);
  }

  public assertValid(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    return this.validator.assertValid(request);
  }
}
