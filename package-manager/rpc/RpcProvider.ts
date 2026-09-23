/**
 * Provider abstraction.
 *
 * The core of the SDK talks to *this* interface, never to a specific vendor.
 * Public Solana RPC, a private node, Helius, QuickNode, Alchemy or a mock all
 * satisfy the same contract.
 */

export interface SolanaRpcProvider {
  /** Human readable provider name, used in errors and diagnostics. */
  readonly name: string;
  /** The HTTP endpoint in use. */
  readonly endpoint: string;
  request<T>(method: string, params?: readonly unknown[]): Promise<T>;
}

export interface RpcSubscriptionHandle {
  /** Server assigned subscription id, once confirmed. */
  readonly id: number | null;
  unsubscribe(): Promise<void>;
}

/** Providers that also expose websocket subscriptions implement this. */
export interface SolanaRpcSubscriptionProvider {
  readonly wsEndpoint: string;
  subscribe(
    method: string,
    params: readonly unknown[],
    onNotification: (payload: unknown) => void,
  ): Promise<RpcSubscriptionHandle>;
  close(): void;
}

export function supportsSubscriptions(
  provider: unknown,
): provider is SolanaRpcSubscriptionProvider {
  return typeof (provider as SolanaRpcSubscriptionProvider)?.subscribe === "function";
}
