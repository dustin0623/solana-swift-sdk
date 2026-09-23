import { ConfigurationError } from "../errors/index.js";
import type { Network } from "../types/index.js";

/**
 * Network configuration.
 *
 * The defaults are Solana's own public RPC endpoints — the SDK works with no
 * API key and no third-party provider. Public endpoints are heavily rate
 * limited; production apps should pass their own `rpc.url`.
 */
export interface NetworkEndpoints {
  readonly http: string;
  readonly ws: string;
}

export const NETWORKS: Readonly<Record<Network, NetworkEndpoints>> = Object.freeze({
  mainnet: { http: "https://api.mainnet-beta.solana.com", ws: "wss://api.mainnet-beta.solana.com" },
  devnet: { http: "https://api.devnet.solana.com", ws: "wss://api.devnet.solana.com" },
  testnet: { http: "https://api.testnet.solana.com", ws: "wss://api.testnet.solana.com" },
  localnet: { http: "http://127.0.0.1:8899", ws: "ws://127.0.0.1:8900" },
});

export function isNetwork(value: string): value is Network {
  return Object.prototype.hasOwnProperty.call(NETWORKS, value);
}

export function endpointsFor(network: Network): NetworkEndpoints {
  const endpoints = NETWORKS[network];
  if (!endpoints) {
    throw new ConfigurationError(
      `Unknown network "${network}". Use one of: ${Object.keys(NETWORKS).join(", ")}`,
    );
  }
  return endpoints;
}

/** Derives a websocket URL from an HTTP RPC URL when none was supplied. */
export function deriveWsUrl(httpUrl: string): string {
  if (httpUrl.startsWith("https://")) return `wss://${httpUrl.slice("https://".length)}`;
  if (httpUrl.startsWith("http://")) return `ws://${httpUrl.slice("http://".length)}`;
  throw new ConfigurationError(`Cannot derive a websocket URL from "${httpUrl}"`);
}
