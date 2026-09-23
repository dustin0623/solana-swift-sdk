import type { TransactionBuilder } from "../builder/TransactionBuilder.js";
import type { ReaderClient } from "../reader/ReaderClient.js";
import type { TokenClient } from "../tokens/TokenClient.js";
import type { Address } from "../types/index.js";
import { assertAddress } from "../utils/address.js";

export interface NftAsset {
  mint: Address;
  /** Token account currently holding the asset. */
  tokenAccount: Address;
  owner: Address;
  /** Always "1" for a standard NFT. */
  amount: string;
  decimals: number;
  /** Which token program the mint belongs to. */
  program: "spl-token" | "spl-token-2022";
}

/**
 * `solana.nft` — minimal, honest NFT primitives.
 *
 * An NFT here is a token whose mint has 0 decimals and a supply of 1. Metadata
 * standards (Metaplex, compressed NFTs) are deliberately out of scope for now:
 * they live in provider extensions or future modules rather than being faked.
 */
export class NftClient {
  constructor(
    private readonly reader: ReaderClient,
    private readonly tokens: TokenClient,
  ) {}

  /** True when the mint looks like a standard non-fungible token. */
  public async isNft(mint: Address): Promise<boolean> {
    const info = await this.tokens.getMint(mint);
    return info.decimals === 0 && info.supply === "1";
  }

  /** Every zero-decimal, single-unit token the owner holds. */
  public async ownedBy(owner: Address): Promise<NftAsset[]> {
    const accounts = await this.reader.tokenBalances(assertAddress(owner, "owner"));
    const candidates = accounts.filter(
      (account) => account.amount.decimals === 0 && account.amount.amount === "1",
    );

    const assets: NftAsset[] = [];
    for (const account of candidates) {
      const info = await this.tokens.getMint(account.mint);
      if (info.supply !== "1") continue;
      assets.push({
        mint: account.mint,
        tokenAccount: account.address,
        owner: account.owner ?? owner,
        amount: account.amount.amount,
        decimals: 0,
        program: info.program,
      });
    }
    return assets;
  }

  /** Builds a transfer of one NFT unit. Nothing is broadcast here. */
  public transfer(options: {
    mint: Address;
    from: Address;
    to: Address;
    feePayer?: Address;
  }): Promise<TransactionBuilder> {
    return this.tokens.transfer({
      mint: options.mint,
      owner: options.from,
      to: options.to,
      amount: 1n,
      ...(options.feePayer ? { feePayer: options.feePayer } : {}),
    });
  }
}
