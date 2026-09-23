/**
 * Typed SDK errors.
 *
 * Every error carries a stable `code` so applications can branch on failure
 * type without string matching. RPC errors keep the raw JSON-RPC payload so
 * nothing the node reported is lost.
 */

export type SolanaSdkErrorCode =
  | "RPC_ERROR"
  | "HTTP_ERROR"
  | "TRANSACTION_ERROR"
  | "SIMULATION_ERROR"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "PROVIDER_ERROR"
  | "SUBSCRIPTION_ERROR"
  | "UNSUPPORTED_OPERATION"
  | "SWAP_EXECUTION_ERROR";

export class SolanaSdkError extends Error {
  public readonly code: SolanaSdkErrorCode;

  constructor(code: SolanaSdkErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** A JSON-RPC level failure returned by the node. */
export class RpcError extends SolanaSdkError {
  public readonly method: string;
  public readonly rpcCode: number | undefined;
  public readonly data: unknown;

  constructor(options: {
    method: string;
    message: string;
    rpcCode?: number | undefined;
    data?: unknown;
  }) {
    super("RPC_ERROR", `RPC ${options.method} failed: ${options.message}`);
    this.method = options.method;
    this.rpcCode = options.rpcCode;
    this.data = options.data;
  }
}

/** Transport level failure (non-2xx HTTP, unreachable endpoint, bad JSON). */
export class RpcHttpError extends SolanaSdkError {
  public readonly status: number | undefined;
  public readonly endpoint: string;

  constructor(options: { endpoint: string; message: string; status?: number | undefined }) {
    super("HTTP_ERROR", `RPC transport error (${options.endpoint}): ${options.message}`);
    this.endpoint = options.endpoint;
    this.status = options.status;
  }
}

export class TransactionError extends SolanaSdkError {
  public readonly signature: string | undefined;
  public override readonly cause: unknown;

  constructor(message: string, options: { signature?: string | undefined; cause?: unknown } = {}) {
    super("TRANSACTION_ERROR", message);
    this.signature = options.signature;
    this.cause = options.cause;
  }
}

export class SimulationError extends SolanaSdkError {
  public readonly logs: readonly string[];
  public readonly simulationError: unknown;
  public readonly unitsConsumed: number | undefined;

  constructor(options: {
    message: string;
    logs?: readonly string[] | undefined;
    error?: unknown;
    unitsConsumed?: number | undefined;
  }) {
    super("SIMULATION_ERROR", options.message);
    this.logs = options.logs ?? [];
    this.simulationError = options.error;
    this.unitsConsumed = options.unitsConsumed;
  }
}

export class ValidationError extends SolanaSdkError {
  public readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super("VALIDATION_ERROR", message);
    this.field = field;
  }
}

export class ConfigurationError extends SolanaSdkError {
  constructor(message: string) {
    super("CONFIGURATION_ERROR", message);
  }
}

export class ProviderError extends SolanaSdkError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super("PROVIDER_ERROR", `${provider}: ${message}`);
    this.provider = provider;
  }
}

export class SubscriptionError extends SolanaSdkError {
  constructor(message: string) {
    super("SUBSCRIPTION_ERROR", message);
  }
}

export class UnsupportedOperationError extends SolanaSdkError {
  constructor(message: string) {
    super("UNSUPPORTED_OPERATION", message);
  }
}

/** Why a swap execution step failed. */
export type SwapFailureReason =
  | "quote_expired"
  | "signer_mismatch"
  | "signing_failed"
  | "simulation_failed"
  | "insufficient_funds"
  | "blockhash_expired"
  | "slippage_exceeded"
  | "rejected"
  | "rpc_error"
  | "timeout"
  | "confirmation_failed";

export type SwapExecutionStage = "validate" | "simulate" | "sign" | "send" | "confirm";

/**
 * Typed swap execution failure. The underlying Solana/RPC error is kept
 * untouched in `cause`, with any program logs in `logs`.
 */
export class SwapExecutionError extends SolanaSdkError {
  public readonly reason: SwapFailureReason;
  public readonly stage: SwapExecutionStage;
  public readonly signature: string | undefined;
  public readonly logs: readonly string[];
  public override readonly cause: unknown;

  constructor(options: {
    reason: SwapFailureReason;
    stage: SwapExecutionStage;
    message: string;
    signature?: string | undefined;
    logs?: readonly string[] | undefined;
    cause?: unknown;
  }) {
    super("SWAP_EXECUTION_ERROR", options.message);
    this.reason = options.reason;
    this.stage = options.stage;
    this.signature = options.signature;
    this.logs = options.logs ?? [];
    this.cause = options.cause;
  }
}
