import { KeypairSigner } from "./KeypairSigner.js";
import { WalletAdapter, type BrowserWalletLike } from "./WalletAdapter.js";

/**
 * `solana.wallet` — signer factories.
 *
 * The SDK never stores keys. Server code builds a KeypairSigner from a secret
 * it loaded itself; browser code wraps the user's wallet so every signature
 * is approved in the wallet UI.
 */
export class WalletClient {
  /** Server-side only. Never ship secret keys to a browser. */
  public keypair(secretKey: Uint8Array): KeypairSigner {
    return new KeypairSigner(secretKey);
  }

  /** Browser wallet (Phantom, Solflare, Backpack…) wrapped as a SolanaSigner. */
  public fromBrowserWallet(
    wallet: BrowserWalletLike,
    signMessageBytes: (message: Uint8Array) => Promise<Uint8Array>,
  ): WalletAdapter {
    return WalletAdapter.fromWallet(wallet, signMessageBytes);
  }
}
