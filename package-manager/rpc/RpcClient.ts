import type { Commitment, Address, Signature } from "../types/index";
import type { SolanaRpcProvider } from "./RpcProvider";
import type {
  CommitmentConfig,
  RpcAccountInfo,
  RpcBlock,
  RpcEpochInfo,
  RpcKeyedAccount,
  RpcResponse,
  RpcSignatureInfo,
  RpcSignatureStatus,
  RpcSimulationValue,
  RpcTokenAmount,
  RpcTransaction,
} from "./types";

export interface RpcClientOptions {
  provider: SolanaRpcProvider;
  /** Commitment applied when a call does not specify one. */
  defaultCommitment?: Commitment;
}

/**
 * Typed wrapper over the provider.
 *
 * Every method here maps 1:1 onto a Solana JSON-RPC method, and `request()`
 * stays public as the escape hatch for anything the SDK does not wrap yet.
 */
export class RpcClient {
  public readonly provider: SolanaRpcProvider;
  public readonly defaultCommitment: Commitment;

  constructor(options: RpcClientOptions) {
    this.provider = options.provider;
    this.defaultCommitment = options.defaultCommitment ?? "confirmed";
  }

  public get endpoint(): string {
    return this.provider.endpoint;
  }

  /** Low-level escape hatch: call any Solana RPC method directly. */
  public request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
    return this.provider.request<T>(method, params);
  }

  private config(config: CommitmentConfig = {}): Record<string, unknown> {
    return { commitment: config.commitment ?? this.defaultCommitment, ...omitUndefined(config) };
  }

  /* ── Accounts & balances ───────────────────────────────────────────── */

  public getBalance(
    address: Address,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<number>> {
    return this.request("getBalance", [address, this.config(config)]);
  }

  public getAccountInfo(
    address: Address,
    config?: CommitmentConfig & { encoding?: string; dataSlice?: { offset: number; length: number } },
  ): Promise<RpcResponse<RpcAccountInfo | null>> {
    return this.request("getAccountInfo", [
      address,
      { encoding: "base64", ...this.config(config) },
    ]);
  }

  public getParsedAccountInfo(
    address: Address,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<RpcAccountInfo | null>> {
    return this.request("getAccountInfo", [
      address,
      { encoding: "jsonParsed", ...this.config(config) },
    ]);
  }

  public getMultipleAccounts(
    addresses: readonly Address[],
    config?: CommitmentConfig & { encoding?: string },
  ): Promise<RpcResponse<Array<RpcAccountInfo | null>>> {
    return this.request("getMultipleAccounts", [
      addresses,
      { encoding: "base64", ...this.config(config) },
    ]);
  }

  public getProgramAccounts(
    programId: Address,
    config?: CommitmentConfig & {
      encoding?: string;
      filters?: readonly unknown[];
      dataSlice?: { offset: number; length: number };
      withContext?: boolean;
    },
  ): Promise<RpcKeyedAccount[] | RpcResponse<RpcKeyedAccount[]>> {
    return this.request("getProgramAccounts", [
      programId,
      { encoding: "base64", ...this.config(config) },
    ]);
  }

  public getMinimumBalanceForRentExemption(
    dataLength: number,
    config?: CommitmentConfig,
  ): Promise<number> {
    return this.request("getMinimumBalanceForRentExemption", [dataLength, this.config(config)]);
  }

  /* ── Chain state ───────────────────────────────────────────────────── */

  public getSlot(config?: CommitmentConfig): Promise<number> {
    return this.request("getSlot", [this.config(config)]);
  }

  public getBlockHeight(config?: CommitmentConfig): Promise<number> {
    return this.request("getBlockHeight", [this.config(config)]);
  }

  public getEpochInfo(config?: CommitmentConfig): Promise<RpcEpochInfo> {
    return this.request("getEpochInfo", [this.config(config)]);
  }

  public getLatestBlockhash(
    config?: CommitmentConfig,
  ): Promise<RpcResponse<{ blockhash: string; lastValidBlockHeight: number }>> {
    return this.request("getLatestBlockhash", [this.config(config)]);
  }

  public getBlock(
    slot: number,
    config?: CommitmentConfig & {
      transactionDetails?: "full" | "accounts" | "signatures" | "none";
      rewards?: boolean;
      encoding?: string;
      maxSupportedTransactionVersion?: number;
    },
  ): Promise<RpcBlock | null> {
    return this.request("getBlock", [
      slot,
      {
        encoding: "json",
        transactionDetails: "signatures",
        rewards: false,
        maxSupportedTransactionVersion: 0,
        ...this.config(config),
      },
    ]);
  }

  /* ── Transactions ──────────────────────────────────────────────────── */

  public getTransaction(
    signature: Signature,
    config?: CommitmentConfig & {
      encoding?: string;
      maxSupportedTransactionVersion?: number;
    },
  ): Promise<RpcTransaction | null> {
    const { commitment, ...rest } = this.config(config);
    return this.request("getTransaction", [
      signature,
      {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
        // getTransaction only accepts confirmed | finalized.
        commitment: commitment === "processed" ? "confirmed" : commitment,
        ...rest,
      },
    ]);
  }

  public getSignaturesForAddress(
    address: Address,
    config?: CommitmentConfig & { limit?: number; before?: string; until?: string },
  ): Promise<RpcSignatureInfo[]> {
    return this.request("getSignaturesForAddress", [address, this.config(config)]);
  }

  public getSignatureStatuses(
    signatures: readonly Signature[],
    config?: { searchTransactionHistory?: boolean },
  ): Promise<RpcResponse<Array<RpcSignatureStatus | null>>> {
    return this.request("getSignatureStatuses", [
      signatures,
      { searchTransactionHistory: config?.searchTransactionHistory ?? false },
    ]);
  }

  public async getSignatureStatus(
    signature: Signature,
    config?: { searchTransactionHistory?: boolean },
  ): Promise<RpcSignatureStatus | null> {
    const response = await this.getSignatureStatuses([signature], config);
    return response.value[0] ?? null;
  }

  public getFeeForMessage(
    base64Message: string,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<number | null>> {
    return this.request("getFeeForMessage", [base64Message, this.config(config)]);
  }

  /**
   * Broadcasts a signed transaction. Never retried automatically: a resend can
   * duplicate side effects, so retry policy belongs to the caller.
   */
  public sendTransaction(
    base64Transaction: string,
    config?: {
      skipPreflight?: boolean;
      preflightCommitment?: Commitment;
      maxRetries?: number;
    },
  ): Promise<Signature> {
    return this.request("sendTransaction", [
      base64Transaction,
      {
        encoding: "base64",
        skipPreflight: config?.skipPreflight ?? false,
        preflightCommitment: config?.preflightCommitment ?? this.defaultCommitment,
        ...(config?.maxRetries !== undefined ? { maxRetries: config.maxRetries } : {}),
      },
    ]);
  }

  public simulateTransaction(
    base64Transaction: string,
    config?: CommitmentConfig & {
      sigVerify?: boolean;
      replaceRecentBlockhash?: boolean;
      accounts?: { encoding: string; addresses: string[] };
    },
  ): Promise<RpcResponse<RpcSimulationValue>> {
    return this.request("simulateTransaction", [
      base64Transaction,
      { encoding: "base64", replaceRecentBlockhash: true, ...this.config(config) },
    ]);
  }

  /* ── SPL tokens ────────────────────────────────────────────────────── */

  public getTokenAccountBalance(
    tokenAccount: Address,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<RpcTokenAmount>> {
    return this.request("getTokenAccountBalance", [tokenAccount, this.config(config)]);
  }

  public getTokenAccountsByOwner(
    owner: Address,
    filter: { mint: Address } | { programId: Address },
    config?: CommitmentConfig & { encoding?: string },
  ): Promise<RpcResponse<RpcKeyedAccount[]>> {
    return this.request("getTokenAccountsByOwner", [
      owner,
      filter,
      { encoding: "jsonParsed", ...this.config(config) },
    ]);
  }

  public getTokenSupply(
    mint: Address,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<RpcTokenAmount>> {
    return this.request("getTokenSupply", [mint, this.config(config)]);
  }

  public getTokenLargestAccounts(
    mint: Address,
    config?: CommitmentConfig,
  ): Promise<RpcResponse<Array<RpcTokenAmount & { address: string }>>> {
    return this.request("getTokenLargestAccounts", [mint, this.config(config)]);
  }

  /* ── Diagnostics ───────────────────────────────────────────────────── */

  public getVersion(): Promise<{ "solana-core": string; "feature-set"?: number }> {
    return this.request("getVersion", []);
  }

  /** Devnet/testnet only; mainnet nodes reject this. */
  public requestAirdrop(
    address: Address,
    lamports: number,
    config?: CommitmentConfig,
  ): Promise<Signature> {
    return this.request("requestAirdrop", [address, lamports, this.config(config)]);
  }
}

function omitUndefined(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) out[key] = entry;
  }
  return out;
}
