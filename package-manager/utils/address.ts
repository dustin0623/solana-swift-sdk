import { ValidationError } from "../errors/index";
import type { Address } from "../types/index";
import { base58Decode, base58Encode, isBase58 } from "./base58";

/** Well known program ids the SDK recognises. Application programs stay out. */
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
export const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";

export const PROGRAM_NAMES: Readonly<Record<string, string>> = Object.freeze({
  [SYSTEM_PROGRAM_ID]: "system",
  [TOKEN_PROGRAM_ID]: "spl-token",
  [TOKEN_2022_PROGRAM_ID]: "spl-token-2022",
  [ASSOCIATED_TOKEN_PROGRAM_ID]: "spl-associated-token-account",
  [MEMO_PROGRAM_ID]: "spl-memo",
  [COMPUTE_BUDGET_PROGRAM_ID]: "compute-budget",
});

export function isValidAddress(value: unknown): value is Address {
  if (typeof value !== "string" || !isBase58(value)) return false;
  try {
    return base58Decode(value).length === 32;
  } catch {
    return false;
  }
}

export function assertAddress(value: unknown, field = "address"): Address {
  if (!isValidAddress(value)) {
    throw new ValidationError(`"${String(value)}" is not a valid Solana address`, field);
  }
  return value;
}

export function addressToBytes(value: Address): Uint8Array {
  return base58Decode(assertAddress(value));
}

export function bytesToAddress(value: Uint8Array): Address {
  if (value.length !== 32) {
    throw new ValidationError(`Expected 32 bytes for an address, received ${value.length}`);
  }
  return base58Encode(value);
}

export function programName(programId: Address): string | null {
  return PROGRAM_NAMES[programId] ?? null;
}

/** Truncates an address for display: `9WzD...AWWM`. */
export function shortAddress(value: Address, edge = 4): string {
  if (value.length <= edge * 2 + 3) return value;
  return `${value.slice(0, edge)}...${value.slice(-edge)}`;
}
