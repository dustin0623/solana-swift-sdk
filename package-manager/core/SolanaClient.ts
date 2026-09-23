import type { BuilderClient } from "../builder/BuilderClient";
import { HttpRpcProvider } from "../rpc/HttpRpcProvider";
import type { SolanaRpcProvider } from "../rpc/RpcProvider";
import { RpcClient } from "../rpc/RpcClient";
import { ReaderClient } from "../reader/ReaderClient";
import { PaymentClient } from "../payments/PaymentClient";
import { TokenClient } from "../tokens/TokenClient";
import { MintClient } from "../tokens/MintClient";
import { NftClient } from "../nft/NftClient";
import { ProgramClient } from "../programs/ProgramClient";
import { StreamEngine } from "../reader/stream/StreamEngine";
import type { SolanaRpcSubscriptionProvider } from "../rpc/RpcProvider";
import { WebSocketRpcProvider } from "../rpc/WebSocketRpcProvider";
import { deriveWsUrl, endpointsFor, isNetwork, type Network } from "./networks";
import type { Commitment, Network as NetworkType } from "../types/index";
import { ConfigurationError } from "../errors/index";

export interface SolanaClientOptions {
  /**
   * One of mainnet/devnet/testnet/localnet. Defaults to mainnet.
   * A custom `rpc.url` overrides the network endpoint.
   */
  network?: NetworkType | Network;
  rpc?: {
    /** Any Solana JSON-RPC HTTP endpoint. */
    url?: string;
    /** Optional websocket URL; derived from HTTP URL when omitted. */
    wsUrl?: string;
    /** Provider label, used in errors. */
    name?: string;
    headers?: Record<string, string>;
  };
  /** Default commitment for reads and broadcasts. Default "confirmed". */
  defaultCommitment?: Commitment;
  /** Optionally inject a pre-built provider (used in tests / extensions). */
  provider?: SolanaRpcProvider;
}

/**
 * Central SDK client.
 *
 * `new SolanaClient({ network: "devnet" })` works with no API key because the
 * SDK targets standard Solana RPC first. Helius, QuickNode, Alchemy and private
 * nodes are just providers that satisfy the same interface.
 */
export class SolanaClient {
  public readonly network: NetworkType;
  public readonly rpc: RpcClient;
  public readonly reader: ReaderClient;
  public readonly builder: BuilderClient;
  public readonly payments: PaymentClient;
  public readonly tokens: TokenClient;
  public readonly nft: NftClient;
  public readonly programs: ProgramClient;
  public readonly stream: StreamEngine;

  constructor(options: SolanaClientOptions = {}) {
    const network = normalizeNetwork(options.network);
    this.network = network;

    const provider =
      options.provider ??
      (options.rpc?.url
        ? new HttpRpcProvider({
            url: options.rpc.url,
            name: options.rpc.name,
            headers: options.rpc.headers,
          })
        : new HttpRpcProvider({ url: endpointsFor(network).http, name: network }));

    const wsUrl = options.rpc?.wsUrl ?? deriveWsUrlIfPossible(options.rpc?.url ?? endpointsFor(network).http);
    const subscriptionProvider: SolanaRpcSubscriptionProvider | null = wsUrl
      ? new WebSocketRpcProvider({ url: wsUrl })
      : null;

    this.rpc = new RpcClient({
      provider,
      defaultCommitment: options.defaultCommitment ?? "confirmed",
    });

    this.reader = new ReaderClient(this.rpc);
    this.builder = new BuilderClient(this.rpc);
    this.tokens = new TokenClient(this.reader, this.builder, new MintClient(this.rpc));
    this.payments = new PaymentClient({
      builder: this.builder,
      tokens: this.tokens,
      transactions: this.reader.transactions,
      mints: this.tokens.mints,
    });
    this.nft = new NftClient(this.reader, this.tokens);
    this.programs = new ProgramClient(this.rpc, this.reader.accounts);
    this.stream = new StreamEngine(
      this.rpc,
      subscriptionProvider,
      options.defaultCommitment ?? "confirmed",
    );
  }

  /** Request a devnet/testnet airdrop. Mainnet RPCs reject this. */
  public async requestAirdrop(address: string, lamports: number | bigint): Promise<string> {
    return this.rpc.requestAirdrop(address, Number(lamports));
  }
}

function normalizeNetwork(value: NetworkType | Network | undefined): NetworkType {
  if (!value) return "mainnet";
  if (isNetwork(value)) return value;
  throw new ConfigurationError(
    `Unknown network "${value}". Use one of: mainnet, devnet, testnet, localnet`,
  );
}

function deriveWsUrlIfPossible(url: string): string | null {
  try {
    return deriveWsUrl(url);
  } catch {
    return null;
  }
}
