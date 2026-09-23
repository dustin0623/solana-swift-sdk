import { ValidationError } from "../errors/index.js";
import type { Address } from "../types/index.js";
import type { SolanaSigner } from "./Signer.js";

/**
 * The subset of a browser wallet this adapter needs.
 *
 * Wallet libraries differ in their transaction object types, so the adapter is
 * built around raw message-byte signing, which every wallet standard exposes.
 * Applications wire the hook to whatever their wallet library provides.
 */
export interface BrowserWalletLike {
  publicKey?: { toBase58(): string } | string | null;
  signMessage?(message: Uint8Array): Promise<Uint8Array | { signature: Uint8Array }>;
}

export interface WalletAdapterOptions {
  address: Address;
  /**
   * Produces a signature over compiled transaction message bytes. Provided by
   * the application using its wallet library. The wallet must prompt the user:
   * the SDK never signs on a user's behalf.
   */
  signMessageBytes: (message: Uint8Array) => Promise<Uint8Array>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Browser signer. No private key ever reaches the SDK — signing is delegated
 * to the wallet, which is responsible for explicit user confirmation.
 */
export class WalletAdapter implements SolanaSigner {
  public readonly address: Address;
  private readonly signBytes: (message: Uint8Array) => Promise<Uint8Array>;
  private readonly signOffChain: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;

  constructor(options: WalletAdapterOptions) {
    if (!options.address) throw new ValidationError("Wallet address is required", "address");
    this.address = options.address;
    this.signBytes = options.signMessageBytes;
    this.signOffChain = options.signMessage;
  }

  /** Builds an adapter for a wallet that only exposes off-chain signMessage. */
  public static fromWallet(
    wallet: BrowserWalletLike,
    signMessageBytes: (message: Uint8Array) => Promise<Uint8Array>,
  ): WalletAdapter {
    const key = wallet.publicKey;
    const address = typeof key === "string" ? key : key?.toBase58();
    if (!address) throw new ValidationError("Wallet is not connected", "publicKey");

    const offChain = wallet.signMessage;
    return new WalletAdapter({
      address,
      signMessageBytes,
      ...(offChain
        ? {
            signMessage: async (message: Uint8Array) => {
              const result = await offChain.call(wallet, message);
              return result instanceof Uint8Array ? result : result.signature;
            },
          }
        : {}),
    });
  }

  public signMessageBytes(message: Uint8Array): Promise<Uint8Array> {
    return this.signBytes(message);
  }

  public async signMessage(message: Uint8Array | string): Promise<Uint8Array> {
    if (!this.signOffChain) {
      throw new ValidationError("This wallet does not support off-chain message signing");
    }
    return this.signOffChain(
      typeof message === "string" ? new TextEncoder().encode(message) : message,
    );
  }
}
