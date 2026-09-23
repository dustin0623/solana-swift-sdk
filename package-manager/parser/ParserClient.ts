import type { RpcTransaction } from "../rpc/types.js";
import type { Address, ParsedTransaction, Signature } from "../types/index.js";
import { LogParser } from "./LogParser.js";
import { TransactionParser } from "./TransactionParser.js";

/**
 * `solana.parser` — offline parsing of raw RPC payloads.
 *
 * Useful when you already hold a `getTransaction` response (from a webhook,
 * a cache or another provider) and want the same normalized shape that
 * `solana.reader.transaction()` returns, without another RPC round trip.
 */
export class ParserClient {
  public readonly logs = LogParser;

  /** Normalizes a raw `getTransaction` (jsonParsed) response. */
  public transaction(signature: Signature, raw: RpcTransaction): ParsedTransaction {
    return TransactionParser.parse(signature, raw);
  }

  /** All account keys, with address lookup table entries resolved. */
  public accountKeys(raw: RpcTransaction): Address[] {
    return TransactionParser.accountKeys(raw);
  }

  /** True when a versioned transaction loaded addresses from lookup tables. */
  public usesLookupTables(raw: RpcTransaction): boolean {
    return TransactionParser.usesLookupTables(raw);
  }
}
