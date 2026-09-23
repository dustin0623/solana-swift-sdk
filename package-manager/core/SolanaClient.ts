import { BuilderClient } from "../builder/BuilderClient.js";
import { HttpRpcProvider } from "../rpc/HttpRpcProvider.js";
import type { SolanaRpcProvider } from "../rpc/RpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { ReaderClient } from "../reader/ReaderClient.js";
import { PaymentClient } from "../payments/PaymentClient.js";
import { TokenClient } from "../tokens/TokenClient.js";
import { MintClient } from "../tokens/MintClient.js";
import { NftClient } from "../nft/NftClient.js";
import { ProgramClient } from "../programs/ProgramClient.js";
import { ParserClient } from "../parser/ParserClient.js";
import { WalletClient } from "../wallet/WalletClient.js";
import type { BlockReader } from "../reader/BlockReader.js";
import { StreamEngine } from "../reader/stream/StreamEngine.js";
import type { SolanaRpcSubscriptionProvider } from "../rpc/RpcProvider.js";
import { WebSocketRpcProvider } from "../rpc/WebSocketRpcProvider.js";
import { deriveWsUrl, endpointsFor, isNetwork } from "./networks.js";
import type { Commitment, Network as NetworkType } from "../types/index.js";
import { ConfigurationError } from "../errors/index.js";

export interface SolanaClientOptions {
  /**
   * One of mainnet/devnet/testnet/localnet. Defaults to mainnet.
   * A custom `rpc.url` overrides the network endpoint.
   */
  network?: NetworkType;
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
  /** Offline parsing of raw RPC payloads. */
  public readonly parser: ParserClient;
  /** Signer factories (server keypairs, browser wallets). */
  public readonly wallet: WalletClient;
  /** Shortcut for `reader.blocks`. */
  public readonly blocks: BlockReader;
  /** Label of the active RPC provider (e.g. "devnet", "helius", "mock"). */
  public readonly providerName: string;

  constructor(options: SolanaClientOptions = {}) {
    const network = normalizeNetwork(options.network);
    this.network = network;

    const provider =
      options.provider ??
      (options.rpc?.url
        ? new HttpRpcProvider({
            url: options.rpc.url,
            name: options.rpc.name ?? network,
            ...(options.rpc.headers ? { headers: options.rpc.headers } : {}),
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

    this.providerName = provider.name;
    this.reader = new ReaderClient(this.rpc);
    this.blocks = this.reader.blocks;
    this.parser = new ParserClient();
    this.wallet = new WalletClient();
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
    this.pools = new PoolClient([], this.reader.accounts);
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

function normalizeNetwork(value: NetworkType | undefined): NetworkType {
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
