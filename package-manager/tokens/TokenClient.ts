import type { BuilderClient } from "../builder/BuilderClient.js";
import { InstructionBuilder } from "../builder/InstructionBuilder.js";
import type { TransactionBuilder } from "../builder/TransactionBuilder.js";
import type { ReaderClient } from "../reader/ReaderClient.js";
import type { Address, MintInfo, TokenBalance } from "../types/index.js";
import { assertAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../utils/address.js";
import { fromBaseUnits, toBaseUnits } from "../utils/amount.js";
import { MintClient } from "./MintClient.js";
import type { CommitmentConfig } from "../rpc/types.js";
import type { TokenAccountsQuery, TokenMetadataOptions } from "../reader/TokenReader.js";
import type {
  NativeSol,
  Token,
  TokenAccount,
  TokenBalanceSummary,
  TokenMetadata,
  TokenSupply,
} from "../types/token.js";
import { TransferClient, type TokenTransferRequest } from "./TransferClient.js";
import { TokenDiscoveryClient } from "../discovery/TokenDiscoveryClient.js";
import { RpcTokenDiscoveryProvider } from "../discovery/providers/RpcTokenDiscoveryProvider.js";
import type {
  DiscoveredToken,
  DiscoveryListQuery,
  DiscoveryPage,
  DiscoverySearchQuery,
} from "../discovery/types.js";

/**
 * `solana.tokens` — SPL token reads and transaction builders.
 *
 * Every builder returns an unsent TransactionBuilder: nothing is broadcast
 * until the application calls `send()` with explicit signers.
 */
export class TokenClient {
  public readonly mints: MintClient;
  public readonly transfers: TransferClient;
  /**
   * Token discovery ("which tokens should I show?"), kept separate from token
   * data ("tell me about this mint"). Ships with the on-chain RPC provider;
   * register indexed or market-data providers for listing and text search.
   */
  public readonly discovery: TokenDiscoveryClient;

  constructor(
    private readonly reader: ReaderClient,
    private readonly builder: BuilderClient,
    mints: MintClient,
  ) {
    this.mints = mints;
    this.transfers = new TransferClient(builder, mints);
    this.discovery = new TokenDiscoveryClient([new RpcTokenDiscoveryProvider(reader.tokens)]);
  }

  /** Shortcut for `tokens.discovery.search(...)`. */
  public search(
    query: string | DiscoverySearchQuery,
  ): Promise<DiscoveryPage<DiscoveredToken>> {
    return this.discovery.search(query);
  }

  /** Shortcut for `tokens.discovery.list(...)`. */
  public list(query: DiscoveryListQuery = {}): Promise<DiscoveryPage<DiscoveredToken>> {
    return this.discovery.list(query);
  }


  public getMint(mint: Address): Promise<MintInfo> {
    return this.mints.get(mint);
  }

  /** Associated token account address for an owner and mint. */
  public async associatedAddress(owner: Address, mint: Address): Promise<Address> {
    const info = await this.mints.get(mint);
    return InstructionBuilder.associatedTokenAddress(
      owner,
      mint,
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
    );
  }

  /** Token balance for an owner of a specific mint. Zero when no account. */
  public async getBalance(
    owner: Address,
    mint: Address,
  ): Promise<{ amount: string; decimals: number; uiAmount: string }> {
    const info = await this.mints.get(mint);
    const accounts = await this.reader.tokenBalances(owner, { mint });
    const total = accounts.reduce((sum, account) => sum + BigInt(account.amount.amount), 0n);
    return {
      amount: total.toString(),
      decimals: info.decimals,
      uiAmount: fromBaseUnits(total, info.decimals),
    };
  }

  /** Mint facts + asset kind for any SPL Token / Token-2022 mint. */
  public get(mint: Address, config?: CommitmentConfig): Promise<Token> {
    return this.reader.tokens.get(mint, config);
  }

  /** Exact balance of a mint (all token accounts summed) or native SOL via `NATIVE_SOL`. */
  public balance(
    query: { owner: Address; mint: Address | NativeSol } & CommitmentConfig,
  ): Promise<TokenBalanceSummary> {
    return this.reader.tokens.balance(query);
  }

  /** Current supply straight from `getTokenSupply`. */
  public supply(mint: Address, config?: CommitmentConfig): Promise<TokenSupply> {
    return this.reader.tokens.supply(mint, config);
  }

  /** On-chain metadata plus optional validated off-chain JSON. Never throws for missing metadata. */
  public metadata(mint: Address, options?: TokenMetadataOptions): Promise<TokenMetadata> {
    return this.reader.tokens.metadata(mint, options);
  }

  /**
   * Token accounts for an owner across SPL Token and Token-2022.
   * The legacy `(owner, mint?)` form returns the older TokenBalance shape and
   * only scans classic SPL Token when no mint is given.
   */
  public accounts(query: TokenAccountsQuery): Promise<TokenAccount[]>;
  public accounts(owner: Address, mint?: Address): Promise<TokenBalance[]>;
  public accounts(
    query: TokenAccountsQuery | Address,
    mint?: Address,
  ): Promise<TokenAccount[] | TokenBalance[]> {
    if (typeof query === "object") return this.reader.tokens.accounts(query);
    return this.reader.tokenBalances(query, mint ? { mint } : undefined);
  }

  public transfer(request: TokenTransferRequest): Promise<TransactionBuilder> {
    return this.transfers.build(request);
  }

  /** Mints new units. The caller must sign as the mint authority. */
  public async mint(options: {
    mint: Address;
    to: Address;
    authority: Address;
    amount: string | bigint;
    feePayer?: Address;
  }): Promise<TransactionBuilder> {
    const info = await this.mints.get(options.mint);
    const tokenProgram =
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const feePayer = assertAddress(options.feePayer ?? options.authority, "feePayer");
    const destination = InstructionBuilder.associatedTokenAddress(
      options.to,
      info.address,
      tokenProgram,
    );
    const amount =
      typeof options.amount === "bigint"
        ? options.amount
        : toBaseUnits(options.amount, info.decimals);

    return this.builder
      .create()
      .feePayer(feePayer)
      .add(
        InstructionBuilder.createAssociatedTokenAccount({
          payer: feePayer,
          owner: options.to,
          mint: info.address,
          programId: tokenProgram,
          idempotent: true,
        }),
        InstructionBuilder.mintTo({
          mint: info.address,
          destination,
          authority: options.authority,
          amount,
          programId: tokenProgram,
        }),
      );
  }

  /** Burns units from the owner's associated token account. */
  public async burn(options: {
    mint: Address;
    owner: Address;
    amount: string | bigint;
    feePayer?: Address;
  }): Promise<TransactionBuilder> {
    const info = await this.mints.get(options.mint);
    const tokenProgram =
      info.program === "spl-token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const account = InstructionBuilder.associatedTokenAddress(
      options.owner,
      info.address,
      tokenProgram,
    );
    const amount =
      typeof options.amount === "bigint"
        ? options.amount
        : toBaseUnits(options.amount, info.decimals);

    return this.builder
      .create()
      .feePayer(assertAddress(options.feePayer ?? options.owner, "feePayer"))
      .add(
        InstructionBuilder.burn({
          account,
          mint: info.address,
          authority: options.owner,
          amount,
          programId: tokenProgram,
        }),
      );
  }
}
