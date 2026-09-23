import type { Address } from "../../types/index.js";
import type { OnChainTokenMetadata, TokenCreator } from "../../types/token.js";
import { addressToBytes, bytesToAddress } from "../../utils/address.js";
import { findProgramAddress } from "../../utils/pda.js";

/** Metaplex Token Metadata program id (a standard, not an SDK dependency). */
export const METAPLEX_METADATA_PROGRAM_ID: Address = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

/** The Metaplex metadata PDA for a mint: ["metadata", programId, mint]. */
export function metaplexMetadataAddress(mint: Address): Address {
  return findProgramAddress(
    ["metadata", addressToBytes(METAPLEX_METADATA_PROGRAM_ID), addressToBytes(mint)],
    METAPLEX_METADATA_PROGRAM_ID,
  ).address;
}

class Cursor {
  private offset = 0;
  constructor(private readonly bytes: Uint8Array) {}
  private need(n: number): void {
    if (this.offset + n > this.bytes.length) throw new Error("Metadata account is truncated");
  }
  public u8(): number {
    this.need(1);
    return this.bytes[this.offset++]!;
  }
  public u16(): number {
    const lo = this.u8();
    return lo | (this.u8() << 8);
  }
  public u32(): number {
    this.need(4);
    const b = this.bytes;
    const o = this.offset;
    this.offset += 4;
    return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16)) + b[o + 3]! * 0x1000000;
  }
  public pubkey(): Address {
    this.need(32);
    const slice = this.bytes.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return bytesToAddress(slice);
  }
  public string(max = 1024): string {
    const len = this.u32();
    if (len > max) throw new Error("Metadata string length is implausible");
    this.need(len);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      this.bytes.slice(this.offset, this.offset + len),
    );
    this.offset += len;
    // Metaplex pads fixed-width fields with NUL bytes.
    return text.replace(/\0+$/g, "").trim();
  }
  public remaining(): number {
    return this.bytes.length - this.offset;
  }
}

/**
 * Decodes the stable prefix of a Metaplex metadata account (key, update
 * authority, mint, name, symbol, uri, royalties, creators, primarySale,
 * isMutable). Later optional fields (collection, uses…) are not interpreted.
 * Throws on malformed data; callers turn that into a warning.
 */
export function decodeMetaplexMetadata(
  address: Address,
  expectedMint: Address,
  data: Uint8Array,
): OnChainTokenMetadata {
  const c = new Cursor(data);
  const key = c.u8();
  if (key !== 4) throw new Error(`Not a Metaplex MetadataV1 account (key ${key})`);
  const updateAuthority = c.pubkey();
  const mint = c.pubkey();
  if (mint !== expectedMint) throw new Error("Metadata account belongs to a different mint");
  const name = c.string(200);
  const symbol = c.string(50);
  const uri = c.string(500);
  const sellerFeeBasisPoints = c.u16();
  const creators: TokenCreator[] = [];
  if (c.u8() === 1) {
    const count = c.u32();
    if (count > 5) throw new Error("Too many creators");
    for (let i = 0; i < count; i += 1) {
      creators.push({ address: c.pubkey(), verified: c.u8() === 1, share: c.u8() });
    }
  }
  let isMutable: boolean | null = null;
  if (c.remaining() >= 2) {
    c.u8(); // primarySaleHappened
    isMutable = c.u8() === 1;
  }
  return {
    source: "metaplex",
    address,
    name,
    symbol,
    uri,
    updateAuthority,
    sellerFeeBasisPoints,
    creators,
    isMutable,
    additionalMetadata: [],
  };
}
