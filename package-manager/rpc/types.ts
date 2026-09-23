import type { Commitment } from "../types/index.js";

/** Every RPC response that carries a context slot. */
export interface RpcResponse<T> {
  context: { slot: number; apiVersion?: string };
  value: T;
}

export interface RpcAccountInfo {
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number | string;
  /** [data, "base64"] or a jsonParsed object. */
  data: [string, string] | Record<string, unknown>;
  space?: number;
}

export interface RpcTokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

export interface RpcTransactionMeta {
  err: unknown;
  fee: number;
  preBalances: number[];
  postBalances: number[];
  preTokenBalances?: RpcTokenBalance[];
  postTokenBalances?: RpcTokenBalance[];
  innerInstructions?: Array<{ index: number; instructions: RpcInstruction[] }>;
  logMessages?: string[];
  loadedAddresses?: { writable: string[]; readonly: string[] };
  computeUnitsConsumed?: number;
}

export interface RpcTokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: RpcTokenAmount;
}

export interface RpcInstruction {
  programId?: string;
  programIdIndex?: number;
  accounts?: number[];
  parsed?: unknown;
  program?: string;
  data?: string;
  stackHeight?: number | null;
}

export interface RpcTransaction {
  slot: number;
  blockTime: number | null;
  version?: "legacy" | number;
  meta: RpcTransactionMeta | null;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: Array<string | { pubkey: string; signer: boolean; writable: boolean }>;
      instructions: RpcInstruction[];
      recentBlockhash: string;
      addressTableLookups?: Array<{
        accountKey: string;
        writableIndexes: number[];
        readonlyIndexes: number[];
      }>;
      header?: {
        numRequiredSignatures: number;
        numReadonlySignedAccounts: number;
        numReadonlyUnsignedAccounts: number;
      };
    };
  };
}

export interface RpcBlock {
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  blockTime: number | null;
  blockHeight: number | null;
  signatures?: string[];
  transactions?: unknown[];
}

export interface RpcSignatureInfo {
  signature: string;
  slot: number;
  err: unknown;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: Commitment | null;
}

export interface RpcSignatureStatus {
  slot: number;
  confirmations: number | null;
  err: unknown;
  confirmationStatus: Commitment | null;
}

export interface RpcSimulationValue {
  err: unknown;
  logs: string[] | null;
  accounts: unknown;
  unitsConsumed?: number;
  returnData?: unknown;
}

export interface RpcEpochInfo {
  absoluteSlot: number;
  blockHeight: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  transactionCount: number | null;
}

export interface RpcKeyedAccount {
  pubkey: string;
  account: RpcAccountInfo;
}

export interface CommitmentConfig {
  commitment?: Commitment;
  minContextSlot?: number;
}
