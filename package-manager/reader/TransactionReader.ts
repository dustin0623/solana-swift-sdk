import { TransactionParser } from "../parser/TransactionParser.js";
import type { RpcClient } from "../rpc/RpcClient.js";
import type { CommitmentConfig } from "../rpc/types.js";
import type {
  Address,
  ParsedTransaction,
  Signature,
  SignatureRecord,
  TransactionStatusInfo,
} from "../types/index.js";
import { assertAddress } from "../utils/address.js";

/**
 * Transaction reading — legacy and versioned, with lookup tables resolved.
 *
 * `null` means the node has no record of the signature at the requested
 * commitment; it does not mean the transaction failed.
 */
export class TransactionReader {
  constructor(private readonly rpc: RpcClient) {}

  public async get(
    signature: Signature,
    config?: CommitmentConfig,
  ): Promise<ParsedTransaction | null> {
    const response = await this.rpc.getTransaction(signature, config);
    return response ? TransactionParser.parse(signature, response) : null;
  }

  /** Fetches several transactions. Missing ones come back as null. */
  public async many(
    signatures: readonly Signature[],
    config?: CommitmentConfig,
  ): Promise<Array<ParsedTransaction | null>> {
    return Promise.all(signatures.map((signature) => this.get(signature, config)));
  }

  public async signaturesFor(
    address: Address,
    options: { limit?: number; before?: string; until?: string } & CommitmentConfig = {},
  ): Promise<SignatureRecord[]> {
    const records = await this.rpc.getSignaturesForAddress(assertAddress(address), {
      limit: 20,
      ...options,
    });
    return records.map((record) => ({
      signature: record.signature,
      slot: record.slot,
      blockTime: record.blockTime ?? null,
      err: record.err ?? null,
      memo: record.memo ?? null,
      confirmationStatus: record.confirmationStatus ?? null,
    }));
  }

  /** Signature history for an address, already parsed. */
  public async forAddress(
    address: Address,
    options: { limit?: number; before?: string; until?: string } & CommitmentConfig = {},
  ): Promise<ParsedTransaction[]> {
    const records = await this.signaturesFor(address, options);
    const parsed = await this.many(
      records.map((record) => record.signature),
      options,
    );
    return parsed.filter((entry): entry is ParsedTransaction => entry !== null);
  }

  public async status(signature: Signature): Promise<TransactionStatusInfo | null> {
    const status = await this.rpc.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (!status) return null;
    return {
      slot: status.slot,
      confirmations: status.confirmations ?? null,
      confirmationStatus: status.confirmationStatus ?? null,
      err: status.err ?? null,
    };
  }
}
