import type { RpcClient } from "../rpc/RpcClient.js";
import type { CommitmentConfig } from "../rpc/types.js";
import type { BlockSummary, Signature } from "../types/index.js";

/** Block reads. Defaults to signature-level detail to keep payloads small. */
export class BlockReader {
  constructor(private readonly rpc: RpcClient) {}

  public async get(
    slot: number,
    config?: CommitmentConfig & {
      transactionDetails?: "full" | "accounts" | "signatures" | "none";
    },
  ): Promise<BlockSummary | null> {
    const block = await this.rpc.getBlock(slot, config);
    if (!block) return null;
    const signatures = (block.signatures ?? []) as Signature[];
    return {
      slot,
      blockhash: block.blockhash,
      previousBlockhash: block.previousBlockhash,
      parentSlot: block.parentSlot,
      blockTime: block.blockTime ?? null,
      blockHeight: block.blockHeight ?? null,
      signatures,
      transactionCount: signatures.length || (block.transactions?.length ?? 0),
      raw: block,
    };
  }

  /** The most recent block at the requested commitment. */
  public async latest(config?: CommitmentConfig): Promise<BlockSummary | null> {
    const slot = await this.rpc.getSlot(config);
    return this.get(slot, config);
  }
}
