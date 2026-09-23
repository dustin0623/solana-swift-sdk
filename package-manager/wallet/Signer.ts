import type { Address } from "../types/index.js";

/**
 * Signing abstraction.
 *
 * A signer owns a public key and can produce ed25519 signatures over message
 * bytes. Key material never leaves the implementation, is never logged and is
 * never part of any returned value.
 */
export interface SolanaSigner {
  readonly address: Address;
  /** Signs compiled transaction message bytes. */
  signMessageBytes(message: Uint8Array): Promise<Uint8Array>;
  /** Optional off-chain message signing (sign-in, proofs). */
  signMessage?(message: Uint8Array | string): Promise<Uint8Array>;
}

export function isSigner(value: unknown): value is SolanaSigner {
  const candidate = value as SolanaSigner | null;
  return (
    !!candidate &&
    typeof candidate.address === "string" &&
    typeof candidate.signMessageBytes === "function"
  );
}
