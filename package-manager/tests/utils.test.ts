import { describe, expect, it } from "vitest";
import { base58Decode, base58Encode, isBase58 } from "../utils/base58.js";
import { fromBaseUnits, lamportsToSol, solToLamports, toBaseUnits } from "../utils/amount.js";
import {
  assertAddress,
  isValidAddress,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "../utils/address.js";
import { derivePda, findProgramAddress } from "../utils/pda.js";

describe("base58", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const encoded = base58Encode(bytes);
    expect(isBase58(encoded)).toBe(true);
    expect(base58Decode(encoded)).toEqual(bytes);
  });

  it("preserves leading zero bytes", () => {
    const bytes = new Uint8Array([0, 0, 1]);
    expect(base58Decode(base58Encode(bytes))).toEqual(bytes);
  });
});

describe("amount", () => {
  it("converts SOL to lamports without floating point", () => {
    expect(solToLamports("1.5")).toBe(1_500_000_000n);
    expect(solToLamports(2)).toBe(2_000_000_000n);
  });

  it("converts lamports to SOL decimal string", () => {
    expect(lamportsToSol(1_000_000_000n)).toBe("1");
    expect(lamportsToSol(5000n)).toBe("0.000005");
  });

  it("handles token decimals", () => {
    expect(toBaseUnits("100.5", 6)).toBe(100_500_000n);
    expect(fromBaseUnits(100_500_000n, 6)).toBe("100.5");
  });

  it("rejects amounts with too many decimals", () => {
    expect(() => toBaseUnits("1.1234567", 6)).toThrow();
  });
});

describe("address", () => {
  it("validates 32-byte base58 addresses", () => {
    expect(isValidAddress(TOKEN_PROGRAM_ID)).toBe(true);
    expect(isValidAddress("notanaddress")).toBe(false);
    expect(isValidAddress("short")).toBe(false);
  });

  it("assertAddress throws for invalid addresses", () => {
    expect(() => assertAddress("nope")).toThrow();
    expect(assertAddress(TOKEN_PROGRAM_ID)).toBe(TOKEN_PROGRAM_ID);
  });
});

describe("pda", () => {
  it("derives the same PDA for the same seeds", () => {
    const seeds = ["seed"];
    const a = findProgramAddress(seeds, TOKEN_PROGRAM_ID);
    const b = findProgramAddress(seeds, TOKEN_PROGRAM_ID);
    expect(a.address).toBe(b.address);
    expect(a.bump).toBe(b.bump);
    expect(a.bump).toBeGreaterThanOrEqual(0);
    expect(a.bump).toBeLessThanOrEqual(255);
  });

  it("produces different addresses for different programs", () => {
    const seeds = ["seed"];
    const tokenPda = derivePda(seeds, TOKEN_PROGRAM_ID);
    // Use another well-known program that supports a PDA for this seed.
    const otherProgram = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
    const otherPda = derivePda(seeds, otherProgram);
    expect(tokenPda.address).not.toBe(otherPda.address);
  });
});
