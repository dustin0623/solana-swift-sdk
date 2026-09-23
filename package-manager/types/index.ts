/** Shared Solana domain types used across the SDK's public surface. */

/** Solana commitment levels. Always explicit where it affects correctness. */
export type Commitment = "processed" | "confirmed" | "finalized";

export type Network = "mainnet" | "devnet" | "testnet" | "localnet";

/** A base58 encoded 32-byte public key. */
export type Address = string;

/** A base58 encoded 64-byte transaction signature. */
export type Signature = string;

export interface AccountInfo {
  /** Account owner program id. */
  owner: Address;
  /** Balance in lamports (integer, never floating point). */
  lamports: bigint;
  executable: boolean;
  rentEpoch: bigint | null;
  /** Raw account data, base64 decoded. Empty for system accounts. */
  data: Uint8Array;
  /** Parsed jsonParsed payload when the node could decode it. */
  parsed: unknown;
  /** The untouched RPC response for this account. */
  raw: unknown;
}

export interface Balance {
  address: Address;
  lamports: bigint;
  /** Decimal string, never a JS number. */
  sol: string;
  context: { slot: number };
}

export interface TokenAmount {
  /** Raw base units as a string, exactly as the chain stores it. */
  amount: string;
  decimals: number;
  /** Decimal string derived from amount + decimals. */
  uiAmount: string;
}

export interface TokenBalance {
  address: Address;
  mint: Address;
  owner: Address | null;
  amount: TokenAmount;
  raw: unknown;
}

export interface MintInfo {
  address: Address;
  decimals: number;
  supply: string;
  mintAuthority: Address | null;
  freezeAuthority: Address | null;
  isInitialized: boolean;
  /** "spl-token" or "spl-token-2022" — never treated as interchangeable. */
  program: "spl-token" | "spl-token-2022";
  raw: unknown;
}

export interface SolTransfer {
  source: Address;
  destination: Address;
  lamports: bigint;
  sol: string;
  /** Index of the top-level instruction this transfer came from. */
  instructionIndex: number;
  inner: boolean;
}

export interface SplTransfer {
  mint: Address | null;
  source: Address;
  destination: Address;
  authority: Address | null;
  /** Raw base units. */
  amount: string;
  decimals: number | null;
  uiAmount: string | null;
  instructionIndex: number;
  inner: boolean;
}

export interface ParsedInstruction {
  index: number;
  programId: Address;
  /** Program name when the SDK recognises the program id. */
  program: string | null;
  /** Decoded instruction type when known, e.g. "transfer". */
  type: string | null;
  accounts: Address[];
  /** base58 instruction data as returned by the RPC. */
  data: string | null;
  /** jsonParsed info, when the node parsed the instruction. */
  info: unknown;
  inner: ParsedInstruction[];
}

export interface TransactionStatusInfo {
  slot: number;
  confirmations: number | null;
  confirmationStatus: Commitment | null;
  err: unknown;
}

export interface ParsedTransaction {
  signature: Signature;
  slot: number;
  blockTime: number | null;
  success: boolean;
  /** Raw chain error object when the transaction failed. */
  error: unknown;
  /** Fee in lamports. */
  fee: bigint;
  version: "legacy" | number;
  feePayer: Address | null;
  /** Every account key, with lookup table addresses already resolved. */
  accountKeys: Address[];
  transfers: SolTransfer[];
  tokenTransfers: SplTransfer[];
  instructions: ParsedInstruction[];
  programs: Address[];
  logs: string[];
  /** Untouched `getTransaction` response — the escape hatch. */
  raw: unknown;
}

export interface BlockSummary {
  slot: number;
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  blockTime: number | null;
  blockHeight: number | null;
  signatures: Signature[];
  transactionCount: number;
  raw: unknown;
}

export interface SignatureRecord {
  signature: Signature;
  slot: number;
  blockTime: number | null;
  err: unknown;
  memo: string | null;
  confirmationStatus: Commitment | null;
}

export interface SimulationResult {
  success: boolean;
  error: unknown;
  logs: string[];
  unitsConsumed: number | null;
  returnData: unknown;
  raw: unknown;
}

export interface LatestBlockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}
