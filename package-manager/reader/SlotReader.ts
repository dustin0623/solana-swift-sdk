import type { RpcClient } from "../rpc/RpcClient";
import type { CommitmentConfig, RpcEpochInfo } from "../rpc/types";
import type { LatestBlockhash } from "../types/index";

/** Slot, block height, epoch and blockhash reads. */
export class SlotReader {
  constructor(private readonly rpc: RpcClient) {}

  public current(config?: CommitmentConfig): Promise<number> {
    return this.rpc.getSlot(config);
  }

  public blockHeight(config?: CommitmentConfig): Promise<number> {
    return this.rpc.getBlockHeight(config);
  }

  public epoch(config?: CommitmentConfig): Promise<RpcEpochInfo> {
    return this.rpc.getEpochInfo(config);
  }

  public async latestBlockhash(config?: CommitmentConfig): Promise<LatestBlockhash> {
    const response = await this.rpc.getLatestBlockhash(config);
    return {
      blockhash: response.value.blockhash,
      lastValidBlockHeight: response.value.lastValidBlockHeight,
    };
  }
}
