import { ed25519 } from "@noble/curves/ed25519.js";
import { ValidationError } from "../errors/index";
import type { Address } from "../types/index";
import { base58Decode, base58Encode } from "../utils/base58";
import { bytesToAddress } from "../utils/address";
import type { SolanaSigner } from "./Signer";

/**
 * Server-side signer backed by an ed25519 keypair.
 *
 * Intended for backends only. Never construct this in browser code and never
 * ship a secret key to a client bundle. The secret is held in a private field,
 * excluded from JSON serialisation and never included in error messages.
 */
export class KeypairSigner implements SolanaSigner {
  public readonly address: Address;
  readonly #secretKey: Uint8Array;

  /**
   * @param secretKey 64-byte Solana secret key or 32-byte seed, as bytes or a
   * base58 string (the format exported by the Solana CLI and most wallets).
   */
  constructor(secretKey: Uint8Array | string) {
    const bytes = typeof secretKey === "string" ? base58Decode(secretKey) : secretKey;
    if (bytes.length !== 64 && bytes.length !== 32) {
      throw new ValidationError(
        "Secret key must be 32 bytes (seed) or 64 bytes (keypair)",
        "secretKey",
      );
    }
    const seed = bytes.slice(0, 32);
    this.#secretKey = seed;
    this.address = bytesToAddress(ed25519.getPublicKey(seed));

    if (bytes.length === 64) {
      const declared = bytesToAddress(bytes.slice(32));
      if (declared !== this.address) {
        throw new ValidationError("Secret key and public key do not match", "secretKey");
      }
    }
  }

  public static generate(): KeypairSigner {
    return new KeypairSigner(ed25519.utils.randomSecretKey());
  }

  public async signMessageBytes(message: Uint8Array): Promise<Uint8Array> {
    return ed25519.sign(message, this.#secretKey);
  }

  public async signMessage(message: Uint8Array | string): Promise<Uint8Array> {
    const bytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
    return ed25519.sign(bytes, this.#secretKey);
  }

  /** Public key only — the secret is never serialised. */
  public toJSON(): { address: Address } {
    return { address: this.address };
  }

  public override toString(): string {
    return `KeypairSigner(${this.address})`;
  }
}

/** Verifies a signature against an address. Useful for off-chain proofs. */
export function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  address: Address,
): boolean {
  try {
    return ed25519.verify(signature, message, base58Decode(address));
  } catch {
    return false;
  }
}
