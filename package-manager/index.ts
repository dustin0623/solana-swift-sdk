/**
 * SolanaXPH SDK
 *
 * RPC-first, provider-agnostic TypeScript SDK for Solana.
 */

export { SolanaClient } from "./core/SolanaClient.js";
export type { SolanaClientOptions } from "./core/SolanaClient.js";
export { endpointsFor, NETWORKS } from "./core/networks.js";
export type { NetworkEndpoints } from "./core/networks.js";

export type { SolanaRpcProvider, SolanaRpcSubscriptionProvider } from "./rpc/RpcProvider.js";
export { HttpRpcProvider } from "./rpc/HttpRpcProvider.js";
export { WebSocketRpcProvider } from "./rpc/WebSocketRpcProvider.js";
export { MockRpcProvider } from "./rpc/MockRpcProvider.js";
export { RpcClient } from "./rpc/RpcClient.js";
export type { RpcClientOptions } from "./rpc/RpcClient.js";
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
} from "./rpc/types.js";

export { ReaderClient } from "./reader/ReaderClient.js";
export { AccountReader } from "./reader/AccountReader.js";
export { BalanceReader } from "./reader/BalanceReader.js";
export { BlockReader } from "./reader/BlockReader.js";
export { SlotReader } from "./reader/SlotReader.js";
export { TransactionReader } from "./reader/TransactionReader.js";
export { StreamEngine } from "./reader/stream/StreamEngine.js";

export { TransactionParser } from "./parser/TransactionParser.js";
export { InstructionParser } from "./parser/InstructionParser.js";
export { TransferParser } from "./parser/TransferParser.js";
export { TokenTransferParser } from "./parser/TokenTransferParser.js";
export { LogParser } from "./parser/LogParser.js";
export { ParserClient } from "./parser/ParserClient.js";

export { BuilderClient } from "./builder/BuilderClient.js";
export { TransactionBuilder } from "./builder/TransactionBuilder.js";
export { InstructionBuilder } from "./builder/InstructionBuilder.js";
export { MessageCompiler } from "./builder/MessageCompiler.js";
export { createBuiltTransaction, signTransaction, simulateBuilt, assertSimulationSucceeded } from "./builder/TransactionBuilder.js";
export { confirmSignature } from "./builder/confirm.js";
export type { BuildOptions, SendOptions } from "./builder/TransactionBuilder.js";
export type { AccountMeta, BuiltTransaction, CompiledMessage, Instruction } from "./builder/types.js";

export { PaymentClient } from "./payments/PaymentClient.js";
export { PaymentValidator } from "./payments/PaymentValidator.js";
export { SolPaymentClient } from "./payments/SolPaymentClient.js";
export { SplPaymentClient } from "./payments/SplPaymentClient.js";
export type { PaymentExpectation, PaymentValidationRequest, PaymentValidationResult } from "./payments/PaymentValidator.js";
export type { SolTransferRequest } from "./payments/SolPaymentClient.js";
export type { SplTransferRequest } from "./payments/SplPaymentClient.js";

export { TokenClient } from "./tokens/TokenClient.js";
export { MintClient } from "./tokens/MintClient.js";
export { TransferClient } from "./tokens/TransferClient.js";
export type { TokenTransferRequest } from "./tokens/TransferClient.js";

export { NftClient } from "./nft/NftClient.js";
export type { NftAsset } from "./nft/NftClient.js";

export { ProgramClient } from "./programs/ProgramClient.js";

export type { SolanaSigner } from "./wallet/Signer.js";
export { KeypairSigner, verifySignature } from "./wallet/KeypairSigner.js";
export { WalletAdapter } from "./wallet/WalletAdapter.js";
export { WalletClient } from "./wallet/WalletClient.js";

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
} from "./types/index.js";

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
} from "./errors/index.js";
export type { SolanaSdkErrorCode } from "./errors/index.js";

export {
  base58Encode,
  base58Decode,
  isBase58,
} from "./utils/base58.js";
export {
  base64Encode,
  base64Decode,
  concatBytes,
  encodeLength,
  encodeU32LE,
  encodeU64LE,
} from "./utils/bytes.js";
export {
  solToLamports,
  lamportsToSol,
  toBaseUnits,
  fromBaseUnits,
  LAMPORTS_PER_SOL,
} from "./utils/amount.js";
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
} from "./utils/address.js";
export {
  findProgramAddress,
  derivePda,
  createProgramAddress,
  isOnCurve,
} from "./utils/pda.js";

// ── Token infrastructure ──────────────────────────────────────────────
export { TokenReader } from "./reader/TokenReader.js";
export type { TokenAccountsQuery, TokenMetadataOptions } from "./reader/TokenReader.js";
export {
  METAPLEX_METADATA_PROGRAM_ID,
  metaplexMetadataAddress,
  decodeMetaplexMetadata,
} from "./reader/metadata/MetaplexMetadata.js";
export { fetchOffChainMetadata } from "./reader/metadata/OffChainMetadata.js";
export type { OffChainFetchOptions } from "./reader/metadata/OffChainMetadata.js";
export { NATIVE_SOL, WRAPPED_SOL_MINT } from "./types/token.js";
export type {
  NativeSol,
  TokenProgram,
  ExactAmount,
  TokenAsset,
  TokenExtension,
  TokenMint,
  Token,
  TokenSupply,
  TokenAccount,
  TokenAccountState,
  TokenBalanceSummary,
  TokenCreator,
  OnChainTokenMetadata,
  OffChainTokenMetadata,
  TokenMetadata,
} from "./types/token.js";
export { exactAmount, parseTokenAmount, lamportsAmount } from "./utils/tokenAmount.js";
