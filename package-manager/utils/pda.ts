/**
 * Program derived addresses.
 *
 * Derivation is deterministic and validated: a PDA must be off the ed25519
 * curve, so a candidate that lands on the curve is rejected and the next bump
 * is tried, exactly like the on-chain runtime does.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import { ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import { addressToBytes, assertAddress, bytesToAddress } from "./address.js";
import { concatBytes } from "./bytes.js";

const PDA_MARKER = new TextEncoder().encode("ProgramDerivedAddress");

export type PdaSeed = string | Uint8Array;

export interface Pda {
  address: Address;
  bump: number;
}

function seedBytes(seed: PdaSeed): Uint8Array {
  const bytes = typeof seed === "string" ? new TextEncoder().encode(seed) : seed;
  if (bytes.length > 32) {
    throw new ValidationError("PDA seeds are limited to 32 bytes each", "seeds");
  }
  return bytes;
}

/** True when the 32 bytes decode to a valid ed25519 point (i.e. a real key). */
export function isOnCurve(bytes: Uint8Array): boolean {
  try {
    ed25519.Point.fromBytes(bytes);
    return true;
  } catch {
    return false;
  }
}

/** Derives the address for one explicit bump. Throws when it is on the curve. */
export function createProgramAddress(
  seeds: readonly PdaSeed[],
  programId: Address,
): Address {
  const buffer = concatBytes(
    ...seeds.map(seedBytes),
    addressToBytes(assertAddress(programId, "programId")),
    PDA_MARKER,
  );
  const hash = sha256(buffer);
  if (isOnCurve(hash)) {
    throw new ValidationError("Derived address falls on the ed25519 curve", "seeds");
  }
  return bytesToAddress(hash);
}

/** Finds the canonical PDA by scanning bumps from 255 downwards. */
export function findProgramAddress(
  seeds: readonly PdaSeed[],
  programId: Address,
): Pda {
  for (let bump = 255; bump >= 0; bump -= 1) {
    try {
      const address = createProgramAddress([...seeds, Uint8Array.of(bump)], programId);
      return { address, bump };
    } catch {
      // On-curve candidate: try the next bump, as the runtime does.
    }
  }
  throw new ValidationError("Unable to find a valid program derived address", "seeds");
}

/** Alias kept for readability in application code. */
export const derivePda = findProgramAddress;
