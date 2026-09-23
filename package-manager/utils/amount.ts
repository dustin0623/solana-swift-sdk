/**
 * Decimal-safe amount handling.
 *
 * Financial values never touch JavaScript floating point inside the SDK.
 * Everything is converted between decimal strings and bigint base units.
 */

import { ValidationError } from "../errors/index";

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const SOL_DECIMALS = 9;

const DECIMAL_PATTERN = /^-?\d*(\.\d*)?$/;

/** Converts a decimal string (or bigint/number of whole units) into base units. */
export function toBaseUnits(value: string | bigint | number, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new ValidationError(`Invalid decimals: ${decimals}`, "decimals");
  }
  if (typeof value === "bigint") return scaleWhole(value, decimals);

  const text = typeof value === "number" ? numberToDecimalString(value) : value.trim();
  if (text === "" || !DECIMAL_PATTERN.test(text)) {
    throw new ValidationError(`"${String(value)}" is not a valid decimal amount`, "amount");
  }
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart = "", fractionPart = ""] = unsigned.split(".");
  if (fractionPart.length > decimals) {
    throw new ValidationError(
      `Amount "${text}" has more than ${decimals} decimal places for this token`,
      "amount",
    );
  }
  const padded = fractionPart.padEnd(decimals, "0");
  const digits = `${wholePart === "" ? "0" : wholePart}${padded}`;
  const result = BigInt(digits);
  return negative ? -result : result;
}

/** Converts base units into a plain decimal string. Trailing zeros are trimmed. */
export function fromBaseUnits(value: bigint | string, decimals: number): string {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;
  let text = whole.toString();
  if (decimals > 0) {
    const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
    if (fractionText !== "") text += `.${fractionText}`;
  }
  return negative ? `-${text}` : text;
}

export function solToLamports(value: string | bigint | number): bigint {
  return toBaseUnits(value, SOL_DECIMALS);
}

export function lamportsToSol(value: bigint | string | number): string {
  return fromBaseUnits(typeof value === "number" ? BigInt(value) : value, SOL_DECIMALS);
}

function scaleWhole(value: bigint, decimals: number): bigint {
  return value * 10n ** BigInt(decimals);
}

function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new ValidationError("Amount must be a finite value", "amount");
  }
  // Numbers are accepted for ergonomics but immediately normalised to a
  // string; exponent notation would otherwise slip past the decimal parser.
  if (Number.isInteger(value)) return value.toFixed(0);
  return value.toFixed(20).replace(/0+$/, "");
}
