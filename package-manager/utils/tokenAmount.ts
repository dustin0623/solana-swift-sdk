import type { ExactAmount } from "../types/token.js";
import { ValidationError } from "../errors/index.js";
import { fromBaseUnits, SOL_DECIMALS, toBaseUnits } from "./amount.js";

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new ValidationError(`Invalid decimals: ${decimals}`, "decimals");
  }
}

/** Exact amount from raw base units. Accepts bigint or an integer string. */
export function exactAmount(raw: bigint | string, decimals: number): ExactAmount {
  assertDecimals(decimals);
  let value: bigint;
  if (typeof raw === "bigint") value = raw;
  else if (/^-?\d+$/.test(raw)) value = BigInt(raw);
  else throw new ValidationError(`Raw amount must be an integer, got "${raw}"`, "amount");
  return { raw: value, decimals, ui: fromBaseUnits(value, decimals) };
}

/** Exact amount from a human-readable decimal string ("12.5"). Rejects excess precision. */
export function parseTokenAmount(ui: string, decimals: number): ExactAmount {
  assertDecimals(decimals);
  return exactAmount(toBaseUnits(ui, decimals), decimals);
}

/** Lamports as an ExactAmount of SOL (9 decimals). */
export function lamportsAmount(lamports: bigint | string | number): ExactAmount {
  const raw = typeof lamports === "number" ? BigInt(lamports) : lamports;
  return exactAmount(raw, SOL_DECIMALS);
}
