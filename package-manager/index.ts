/**
 * SolanaXPH SDK
 *
 * RPC-first, provider-agnostic TypeScript SDK for Solana.
 */

export { SolanaClient } from "./core/SolanaClient";
export type { SolanaClientOptions } from "./core/SolanaClient";
export { endpointsFor, NETWORKS } from "./core/networks";
export type { NetworkEndpoints } from "./core/networks";

export type { SolanaRpcProvider, SolanaRpcSubscriptionProvider } from "./rpc/RpcProvider";
export { HttpRpcProvider } from "./rpc/HttpRpcProvider";
export { WebSocketRpcProvider } from "./rpc/WebSocketRpcProvider";
export { MockRpcProvider } from "./rpc/MockRpcProvider";
export { RpcClient } from "./rpc/RpcClient";
export type { RpcClientOptions } from "./rpc/RpcClient";
export type {
  RpcAccountInfo,
  RpcBlock,
  RpcEpochInfo,
  RpcResponse,
  RpcSignatureInfo,
  RpcSignatureStatus,
  RpcSimulationValue,
  RpcTokenAmount,
  RpcTokenBalance,
  RpcTransaction,
  CommitmentConfig,
} from "./rpc/types";

export { ReaderClient } from "./reader/ReaderClient";
export { AccountReader } from "./reader/AccountReader";
export { BalanceReader } from "./reader/BalanceReader";
export { BlockReader } from "./reader/BlockReader";
export { SlotReader } from "./reader/SlotReader";
export { TransactionReader } from "./reader/TransactionReader";
export { StreamEngine } from "./reader/stream/StreamEngine";

export { TransactionParser } from "./parser/TransactionParser";
export { InstructionParser } from "./parser/InstructionParser";
export { TransferParser } from "./parser/TransferParser";
export { TokenTransferParser } from "./parser/TokenTransferParser";
export { LogParser } from "./parser/LogParser";

export { BuilderClient } from "./builder/BuilderClient";
export { TransactionBuilder } from "./builder/TransactionBuilder";
export { InstructionBuilder } from "./builder/InstructionBuilder";
export { MessageCompiler } from "./builder/MessageCompiler";
export { createBuiltTransaction, signTransaction, simulateBuilt, assertSimulationSucceeded } from "./builder/TransactionBuilder";
export { confirmSignature } from "./builder/confirm";
export type { BuildOptions, SendOptions } from "./builder/TransactionBuilder";
export type { AccountMeta, BuiltTransaction, CompiledMessage, Instruction } from "./builder/types";

export { PaymentClient } from "./payments/PaymentClient";
export { PaymentValidator } from "./payments/PaymentValidator";
export { SolPaymentClient } from "./payments/SolPaymentClient";
export { SplPaymentClient } from "./payments/SplPaymentClient";
export type { PaymentExpectation, PaymentValidationRequest, PaymentValidationResult } from "./payments/PaymentValidator";
export type { SolTransferRequest } from "./payments/SolPaymentClient";
export type { SplTransferRequest } from "./payments/SplPaymentClient";

export { TokenClient } from "./tokens/TokenClient";
export { MintClient } from "./tokens/MintClient";
export { TransferClient } from "./tokens/TransferClient";
export type { TokenTransferRequest } from "./tokens/TransferClient";

export { NftClient } from "./nft/NftClient";
export type { NftAsset } from "./nft/NftClient";

export { ProgramClient } from "./programs/ProgramClient";

export { SolanaSigner } from "./wallet/Signer";
export { KeypairSigner, verifySignature } from "./wallet/KeypairSigner";
export { WalletAdapter } from "./wallet/WalletAdapter";

export type {
  AccountInfo,
  Address,
  Balance,
  BlockSummary,
  Commitment,
  LatestBlockhash,
  MintInfo,
  Network,
  ParsedInstruction,
  ParsedTransaction,
  Signature,
  SignatureRecord,
  SimulationResult,
  SolTransfer,
  SplTransfer,
  TokenAmount,
  TokenBalance,
  TransactionStatusInfo,
} from "./types/index";

export {
  RpcError,
  RpcHttpError,
  TransactionError,
  SimulationError,
  ValidationError,
  ConfigurationError,
  ProviderError,
  SubscriptionError,
  UnsupportedOperationError,
  SolanaSdkError,
} from "./errors/index";
export type { SolanaSdkErrorCode } from "./errors/index";

export {
  base58Encode,
  base58Decode,
  isBase58,
} from "./utils/base58";
export {
  base64Encode,
  base64Decode,
  concatBytes,
  encodeLength,
  encodeU32LE,
  encodeU64LE,
} from "./utils/bytes";
export {
  solToLamports,
  lamportsToSol,
  toBaseUnits,
  fromBaseUnits,
  LAMPORTS_PER_SOL,
} from "./utils/amount";
export {
  isValidAddress,
  assertAddress,
  addressToBytes,
  bytesToAddress,
  programName,
  shortAddress,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
} from "./utils/address";
export {
  findProgramAddress,
  derivePda,
  createProgramAddress,
  isOnCurve,
} from "./utils/pda";
