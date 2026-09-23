import { ValidationError } from "../errors/index.js";
import type { RpcClient } from "../rpc/RpcClient.js";
import type { CommitmentConfig, RpcAccountInfo, RpcKeyedAccount } from "../rpc/types.js";
import type { Address } from "../types/index.js";
import {
  NATIVE_SOL,
  type NativeSol,
  type OnChainTokenMetadata,
  type Token,
  type TokenAccount,
  type TokenAccountState,
  type TokenAsset,
  type TokenBalanceSummary,
  type TokenExtension,
  type TokenMetadata,
  type TokenMint,
  type TokenProgram,
  type TokenSupply,
} from "../types/token.js";
import { assertAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address.js";
import { base64Decode } from "../utils/bytes.js";
import { exactAmount, lamportsAmount } from "../utils/tokenAmount.js";
import { decodeMetaplexMetadata, metaplexMetadataAddress } from "./metadata/MetaplexMetadata.js";
import { fetchOffChainMetadata, type OffChainFetchOptions } from "./metadata/OffChainMetadata.js";

const NATIVE_ASSET: TokenAsset = { kind: "native", symbol: "SOL", decimals: 9 };

function programOf(owner: string): TokenProgram | null {
  if (owner === TOKEN_PROGRAM_ID) return "spl-token";
  if (owner === TOKEN_2022_PROGRAM_ID) return "spl-token-2022";
  return null;
}

function programIdOf(program: TokenProgram): Address {
  return program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

interface ParsedData {
  parsed?: { type?: string; info?: Record<string, unknown> };
}

function parsedInfo(account: RpcAccountInfo): { type: string | undefined; info: Record<string, unknown> } {
  const data = account.data as ParsedData;
  return { type: data?.parsed?.type, info: data?.parsed?.info ?? {} };
}

function extensionsOf(info: Record<string, unknown>): TokenExtension[] {
  const list = info["extensions"];
  if (!Array.isArray(list)) return [];
  return list
    .filter((e): e is { extension: string; state?: unknown } =>
      typeof e === "object" && e !== null && typeof (e as { extension?: unknown }).extension === "string",
    )
    .map((e) => ({ extension: e.extension, state: e.state ?? null }));
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface TokenAccountsQuery extends CommitmentConfig {
  owner: Address;
  /** Restrict to one mint. */
  mint?: Address;
  /** Programs to scan when no mint is given. Default: both SPL Token and Token-2022. */
  programs?: readonly TokenProgram[];
  /** Drop zero-balance accounts. Default false. */
  nonZero?: boolean;
}

export interface TokenMetadataOptions extends CommitmentConfig {
  /**
   * Fetch the off-chain JSON at the metadata URI. Off by default so reading
   * metadata never triggers an unexpected third-party request.
   */
  offChain?: boolean | OffChainFetchOptions;
}

/**
 * `solana.reader.tokens` — reads for arbitrary SPL / Token-2022 tokens using
 * standard RPC only. Nothing here assumes where a token was created.
 */
export class TokenReader {
  constructor(private readonly rpc: RpcClient) {}

  /** Mint facts for any SPL Token or Token-2022 mint. Throws ValidationError for non-mints. */
  public async mint(mint: Address, config?: CommitmentConfig): Promise<TokenMint> {
    const address = assertAddress(mint, "mint");
    const response = await this.rpc.getParsedAccountInfo(address, config);
    const account = response.value;
    if (!account) throw new ValidationError(`Mint ${address} does not exist`, "mint");
    const program = programOf(account.owner);
    if (!program) {
      throw new ValidationError(`${address} is not owned by the SPL Token or Token-2022 program`, "mint");
    }
    const { type, info } = parsedInfo(account);
    const decimals = info["decimals"];
    if (type !== "mint" || typeof decimals !== "number") {
      throw new ValidationError(`${address} is not a mint account`, "mint");
    }
    const supply = typeof info["supply"] === "string" ? info["supply"] : "0";
    return {
      address,
      program,
      programId: account.owner,
      decimals,
      supply: exactAmount(supply, decimals),
      mintAuthority: str(info["mintAuthority"]),
      freezeAuthority: str(info["freezeAuthority"]),
      isInitialized: info["isInitialized"] !== false,
      extensions: program === "spl-token-2022" ? extensionsOf(info) : [],
      raw: response,
    };
  }

  /** `Token` = asset kind + mint facts. */
  public async get(mint: Address, config?: CommitmentConfig): Promise<Token> {
    const info = await this.mint(mint, config);
    return { asset: { kind: "spl", program: info.program, mint: info.address }, mint: info };
  }

  public async supply(mint: Address, config?: CommitmentConfig): Promise<TokenSupply> {
    const address = assertAddress(mint, "mint");
    const response = await this.rpc.getTokenSupply(address, config);
    return {
      mint: address,
      amount: exactAmount(response.value.amount, response.value.decimals),
      slot: response.context.slot,
      raw: response,
    };
  }

  /** Token accounts owned by a wallet, across SPL Token and Token-2022. */
  public async accounts(query: TokenAccountsQuery): Promise<TokenAccount[]> {
    const { owner, mint, programs, nonZero, ...config } = query;
    const ownerAddress = assertAddress(owner, "owner");
    let entries: RpcKeyedAccount[];
    if (mint) {
      const response = await this.rpc.getTokenAccountsByOwner(
        ownerAddress,
        { mint: assertAddress(mint, "mint") },
        config,
      );
      entries = response.value;
    } else {
      const scan = programs ?? (["spl-token", "spl-token-2022"] as const);
      const responses = await Promise.all(
        scan.map((p) => this.rpc.getTokenAccountsByOwner(ownerAddress, { programId: programIdOf(p) }, config)),
      );
      entries = responses.flatMap((r) => r.value);
    }
    const seen = new Set<string>();
    const accounts: TokenAccount[] = [];
    for (const entry of entries) {
      if (seen.has(entry.pubkey)) continue;
      seen.add(entry.pubkey);
      const account = TokenReader.normalizeAccount(entry);
      if (account && (!nonZero || account.amount.raw > 0n)) accounts.push(account);
    }
    return accounts;
  }

  /**
   * Total balance of one mint for an owner (summing every token account), or
   * native SOL when `mint` is `NATIVE_SOL`. Zero when the owner holds none.
   */
  public async balance(
    query: { owner: Address; mint: Address | NativeSol } & CommitmentConfig,
  ): Promise<TokenBalanceSummary> {
    const { owner, mint, ...config } = query;
    const ownerAddress = assertAddress(owner, "owner");
    if (mint === NATIVE_SOL) {
      const response = await this.rpc.getBalance(ownerAddress, config);
      return { owner: ownerAddress, asset: NATIVE_ASSET, amount: lamportsAmount(BigInt(response.value)), accounts: [] };
    }
    const info = await this.mint(mint, config);
    const accounts = await this.accounts({ owner: ownerAddress, mint: info.address, ...config });
    const total = accounts.reduce((sum, a) => sum + a.amount.raw, 0n);
    return {
      owner: ownerAddress,
      asset: { kind: "spl", program: info.program, mint: info.address },
      amount: exactAmount(total, info.decimals),
      accounts: accounts.map((a) => a.address),
    };
  }

  /**
   * On-chain metadata (Token-2022 metadata extension, else Metaplex PDA) plus
   * optional, validated off-chain JSON. Never throws because metadata is
   * missing or malformed — problems are reported in `warnings`.
   */
  public async metadata(mint: Address, options: TokenMetadataOptions = {}): Promise<TokenMetadata> {
    const { offChain, ...config } = options;
    const info = await this.mint(mint, config);
    const warnings: string[] = [];
    let onChain: OnChainTokenMetadata | null = null;

    if (info.program === "spl-token-2022") {
      onChain = token2022Metadata(info, warnings);
    }
    if (!onChain) {
      const pda = metaplexMetadataAddress(info.address);
      try {
        const response = await this.rpc.getAccountInfo(pda, config);
        const account = response.value;
        if (account && Array.isArray(account.data)) {
          onChain = decodeMetaplexMetadata(pda, info.address, base64Decode(account.data[0]));
        }
      } catch (error) {
        warnings.push(`Metaplex metadata unreadable: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
    if (!onChain) warnings.push("No on-chain metadata found");

    const uri = onChain?.uri ?? null;
    const off = offChain
      ? uri
        ? await fetchOffChainMetadata(uri, typeof offChain === "object" ? offChain : {})
        : { status: "unavailable" as const, uri: null, links: [], error: "No metadata URI" }
      : { status: "skipped" as const, uri, links: [] };

    return {
      mint: info.address,
      program: info.program,
      decimals: info.decimals,
      supply: info.supply,
      onChain,
      offChain: off,
      warnings,
    };
  }

  /** Normalizes one jsonParsed token account. Returns null for non-token data. */
  public static normalizeAccount(entry: RpcKeyedAccount): TokenAccount | null {
    const program = programOf(entry.account.owner);
    const { type, info } = parsedInfo(entry.account);
    if (!program || type !== "account") return null;
    const tokenAmount = info["tokenAmount"] as { amount?: unknown; decimals?: unknown } | undefined;
    const decimals = typeof tokenAmount?.decimals === "number" ? tokenAmount.decimals : 0;
    const raw = typeof tokenAmount?.amount === "string" ? tokenAmount.amount : "0";
    const stateText = info["state"];
    const state: TokenAccountState =
      stateText === "initialized" || stateText === "frozen" || stateText === "uninitialized" ? stateText : "unknown";
    const delegated = info["delegatedAmount"] as { amount?: unknown } | undefined;
    return {
      address: entry.pubkey,
      mint: str(info["mint"]) ?? "",
      owner: str(info["owner"]) ?? "",
      program,
      amount: exactAmount(raw, decimals),
      state,
      isNative: info["isNative"] === true,
      delegate: str(info["delegate"]),
      delegatedAmount: typeof delegated?.amount === "string" ? BigInt(delegated.amount) : 0n,
      extensions: program === "spl-token-2022" ? extensionsOf(info) : [],
      raw: entry,
    };
  }
}

function token2022Metadata(mint: TokenMint, warnings: string[]): OnChainTokenMetadata | null {
  const ext = mint.extensions.find((e) => e.extension === "tokenMetadata");
  const pointer = mint.extensions.find((e) => e.extension === "metadataPointer");
  if (!ext) {
    const target = (pointer?.state as { metadataAddress?: unknown } | undefined)?.metadataAddress;
    if (typeof target === "string" && target !== mint.address) {
      warnings.push(`Metadata pointer targets external account ${target}; reading it is not supported yet`);
    }
    return null;
  }
  const state = (ext.state ?? {}) as Record<string, unknown>;
  const name = str(state["name"]);
  if (name === null && str(state["symbol"]) === null) {
    warnings.push("Token-2022 metadata extension is malformed");
    return null;
  }
  const extra = Array.isArray(state["additionalMetadata"])
    ? (state["additionalMetadata"] as unknown[]).filter(
        (pair): pair is [string, string] =>
          Array.isArray(pair) && typeof pair[0] === "string" && typeof pair[1] === "string",
      )
    : [];
  return {
    source: "token-2022",
    address: mint.address,
    name: name ?? "",
    symbol: str(state["symbol"]) ?? "",
    uri: str(state["uri"]) ?? "",
    updateAuthority: str(state["updateAuthority"]),
    sellerFeeBasisPoints: null,
    creators: [],
    isMutable: null,
    additionalMetadata: extra,
  };
}
