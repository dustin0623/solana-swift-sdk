/**
 * Token domain models.
 *
 * These describe *any* token on Solana — the SDK never assumes a token was
 * created by SolanaXPH, a launchpad or a DEX. Raw amounts are always bigint;
 * `ui` strings are derived with exact decimal arithmetic.
 */
import type { Address } from "./index.js";

/** Which on-chain program owns a mint / token account. Never interchangeable. */
export type TokenProgram = "spl-token" | "spl-token-2022";

/**
 * Sentinel for native SOL. "SOL" can never be a valid base58 address
 * (base58 has no "O"), so it can't be confused with an SPL mint — including
 * the wrapped SOL mint, which *is* a regular SPL mint.
 */
export const NATIVE_SOL = "SOL" as const;
export type NativeSol = typeof NATIVE_SOL;

/** Wrapped SOL: an SPL mint that holds lamports. Not the same as native SOL. */
export const WRAPPED_SOL_MINT: Address = "So11111111111111111111111111111111111111112";

/** Exact amount: raw base units + decimals + derived decimal string. */
export interface ExactAmount {
  raw: bigint;
  decimals: number;
  /** Human-readable decimal string (no floats involved). */
  ui: string;
}

/** Discriminated asset kind, so SOL and SPL tokens are never mixed up. */
export type TokenAsset =
  | { kind: "native"; symbol: "SOL"; decimals: 9 }
  | { kind: "spl"; program: TokenProgram; mint: Address };

/** A Token-2022 extension as reported by the RPC node's jsonParsed output. */
export interface TokenExtension {
  /** Extension name, e.g. "transferFeeConfig", "tokenMetadata", "metadataPointer". */
  extension: string;
  /** Extension state exactly as the node decoded it (not interpreted by the SDK). */
  state: unknown;
}

export interface TokenMint {
  address: Address;
  program: TokenProgram;
  programId: Address;
  decimals: number;
  supply: ExactAmount;
  mintAuthority: Address | null;
  freezeAuthority: Address | null;
  isInitialized: boolean;
  /** Token-2022 only; always empty for classic SPL Token mints. */
  extensions: TokenExtension[];
  raw: unknown;
}

/** `tokens.get()` result. */
export interface Token {
  asset: TokenAsset;
  mint: TokenMint;
}

export interface TokenSupply {
  mint: Address;
  amount: ExactAmount;
  slot: number;
  raw: unknown;
}

export type TokenAccountState = "initialized" | "frozen" | "uninitialized" | "unknown";

export interface TokenAccount {
  address: Address;
  mint: Address;
  owner: Address;
  program: TokenProgram;
  amount: ExactAmount;
  state: TokenAccountState;
  /** True for wrapped-SOL accounts. */
  isNative: boolean;
  delegate: Address | null;
  delegatedAmount: bigint;
  /** Token-2022 extensions on the account (empty for classic SPL). */
  extensions: TokenExtension[];
  raw: unknown;
}

/** Aggregated balance of one mint (or native SOL) for an owner. */
export interface TokenBalanceSummary {
  owner: Address;
  asset: TokenAsset;
  amount: ExactAmount;
  /** Token accounts that contributed. Empty for native SOL. */
  accounts: Address[];
}

export interface TokenCreator {
  address: Address;
  verified: boolean;
  /** Royalty share percentage (0–100). */
  share: number;
}

/** Facts read from chain state. Still self-reported by whoever controls the update authority. */
export interface OnChainTokenMetadata {
  source: "metaplex" | "token-2022";
  /** Account holding the metadata (Metaplex PDA, or the mint for Token-2022). */
  address: Address;
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: Address | null;
  sellerFeeBasisPoints: number | null;
  creators: TokenCreator[];
  isMutable: boolean | null;
  additionalMetadata: Array<[string, string]>;
}

export interface OffChainTokenMetadata {
  status: "skipped" | "ok" | "unavailable" | "invalid";
  uri: string | null;
  /** Only string fields that passed validation. Never trust these blindly. */
  name?: string;
  symbol?: string;
  description?: string;
  /** http(s) URL only. */
  image?: string;
  externalUrl?: string;
  links: Array<{ label: string; url: string }>;
  error?: string;
  raw?: unknown;
}

export interface TokenMetadata {
  mint: Address;
  program: TokenProgram;
  decimals: number;
  supply: ExactAmount;
  onChain: OnChainTokenMetadata | null;
  offChain: OffChainTokenMetadata;
  /** Non-fatal problems (malformed account, unsupported pointer, etc). */
  warnings: string[];
}
