import type { RpcClient } from "../rpc/RpcClient";
import type { CommitmentConfig } from "../rpc/types";
import type {
  AccountInfo,
  Address,
  Balance,
  BlockSummary,
  ParsedTransaction,
  Signature,
  SignatureRecord,
  TokenBalance,
} from "../types/index";
import { AccountReader } from "./AccountReader";
import { BalanceReader } from "./BalanceReader";
import { BlockReader } from "./BlockReader";
import { SlotReader } from "./SlotReader";
import { TransactionReader } from "./TransactionReader";

/**
 * The reader surface: `solana.reader.*`.
 *
 * Short methods cover the common case; the specialised readers stay reachable
 * for everything else, and every result keeps a `raw` field.
 */
export class ReaderClient {
  public readonly accounts: AccountReader;
  public readonly balances: BalanceReader;
  public readonly transactions: TransactionReader;
  public readonly blocks: BlockReader;
  public readonly slots: SlotReader;

  constructor(rpc: RpcClient) {
    this.accounts = new AccountReader(rpc);
    this.balances = new BalanceReader(rpc);
    this.transactions = new TransactionReader(rpc);
    this.blocks = new BlockReader(rpc);
    this.slots = new SlotReader(rpc);
  }

  public balance(address: Address, config?: CommitmentConfig): Promise<Balance> {
    return this.balances.sol(address, config);
  }

  public tokenBalances(
    owner: Address,
    options?: { mint?: Address } & CommitmentConfig,
  ): Promise<TokenBalance[]> {
    return this.balances.tokens(owner, options);
  }

  public account(address: Address, config?: CommitmentConfig): Promise<AccountInfo | null> {
    return this.accounts.parsed(address, config);
  }

  public transaction(
    signature: Signature,
    config?: CommitmentConfig,
  ): Promise<ParsedTransaction | null> {
    return this.transactions.get(signature, config);
  }

  public transactionsOf(
    address: Address,
    options?: { limit?: number } & CommitmentConfig,
  ): Promise<ParsedTransaction[]> {
    return this.transactions.forAddress(address, options);
  }

  public signatures(
    address: Address,
    options?: { limit?: number } & CommitmentConfig,
  ): Promise<SignatureRecord[]> {
    return this.transactions.signaturesFor(address, options);
  }

  public block(slot: number, config?: CommitmentConfig): Promise<BlockSummary | null> {
    return this.blocks.get(slot, config);
  }

  public slot(config?: CommitmentConfig): Promise<number> {
    return this.slots.current(config);
  }
}
