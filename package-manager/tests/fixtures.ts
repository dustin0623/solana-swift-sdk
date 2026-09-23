/**
 * Test fixtures for transaction parsing and reader tests.
 *
 * These are realistic `getTransaction` JSON-RPC shapes with deterministic but
 * fake addresses. They exercise legacy and versioned transactions, inner
 * instructions, SPL transfers, failures and address lookup tables without
 * touching the network.
 */

import { base58Encode } from "../utils/base58.js";
import type { RpcTransaction } from "../rpc/types.js";

const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// Deterministic 32-byte base58 addresses.
const byte = (n: number) => base58Encode(new Uint8Array(32).fill(n));
export const alice = byte(1);
export const bob = byte(2);
export const carol = byte(3);
export const mint = byte(4);
export const aliceAta = "8ZfjnwxdKftw8Kk9xcDmsR2kdyDJhHSaTo2uWypq4m8g";
export const bobAta = "Gw9YRejU7bwbcgNxWYeYBjrS5Z9Mzhf2heC58voURatW";
export const lookupAddr = byte(7);
export const lookupTable = byte(8);

export const SOL_TRANSFER_SIGNATURE = "soltransfer123456789".padEnd(87, "0");
export const FAILED_TX_SIGNATURE = "failedtx123456789".padEnd(87, "0");
export const SPL_TRANSFER_SIGNATURE = "spltransfer123456789".padEnd(87, "0");
export const INNER_IX_SIGNATURE = "innerix123456789".padEnd(87, "0");
export const VERSIONED_SIGNATURE = "versioned123456789".padEnd(87, "0");

export const successfulSolTransfer: RpcTransaction = {
  slot: 123456789,
  blockTime: 1700000000,
  version: "legacy",
  meta: {
    err: null,
    fee: 5000,
    preBalances: [100000000, 0],
    postBalances: [99995000, 5000],
    preTokenBalances: [],
    postTokenBalances: [],
    innerInstructions: [],
    logMessages: [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 success",
    ],
  },
  transaction: {
    signatures: [SOL_TRANSFER_SIGNATURE],
    message: {
      accountKeys: [
        { pubkey: alice, signer: true, writable: true },
        { pubkey: bob, signer: false, writable: true },
        { pubkey: SYSTEM, signer: false, writable: false },
      ],
      instructions: [
        {
          programId: SYSTEM,
          program: "system",
          parsed: {
            type: "transfer",
            info: { source: alice, destination: bob, lamports: 5000 },
          },
        },
      ],
      recentBlockhash: "_blockhash123456789".padEnd(43, "0"),
    },
  },
};

export const failedTransaction: RpcTransaction = {
  ...successfulSolTransfer,
  transaction: {
    ...successfulSolTransfer.transaction,
    signatures: [FAILED_TX_SIGNATURE],
  },
  meta: {
    ...successfulSolTransfer.meta,
    err: { InstructionError: [0, "Custom"] },
    logMessages: [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 failed: custom program error",
    ],
  },
};

export const splTransfer: RpcTransaction = {
  slot: 123456790,
  blockTime: 1700000001,
  version: "legacy",
  meta: {
    err: null,
    fee: 5000,
    preBalances: [100000, 2039280, 2039280, 100000],
    postBalances: [95000, 2039280, 2039280, 100000],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint,
        uiTokenAmount: { amount: "1000000000", decimals: 6, uiAmount: 1000, uiAmountString: "1000" },
        owner: alice,
      },
      {
        accountIndex: 2,
        mint,
        uiTokenAmount: { amount: "0", decimals: 6, uiAmount: 0, uiAmountString: "0" },
        owner: bob,
      },
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint,
        uiTokenAmount: { amount: "900000000", decimals: 6, uiAmount: 900, uiAmountString: "900" },
        owner: alice,
      },
      {
        accountIndex: 2,
        mint,
        uiTokenAmount: { amount: "100000000", decimals: 6, uiAmount: 100, uiAmountString: "100" },
        owner: bob,
      },
    ],
    innerInstructions: [],
    logMessages: [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Program log: Instruction: TransferChecked",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ],
  },
  transaction: {
    signatures: [SPL_TRANSFER_SIGNATURE],
    message: {
      accountKeys: [
        { pubkey: alice, signer: true, writable: false },
        { pubkey: aliceAta, signer: false, writable: true },
        { pubkey: bobAta, signer: false, writable: true },
        { pubkey: mint, signer: false, writable: false },
        { pubkey: TOKEN, signer: false, writable: false },
      ],
      instructions: [
        {
          programId: TOKEN,
          program: "spl-token",
          parsed: {
            type: "transferChecked",
            info: {
              source: aliceAta,
              destination: bobAta,
              authority: alice,
              mint,
              tokenAmount: { amount: "100000000", decimals: 6 },
            },
          },
        },
      ],
      recentBlockhash: "blockhashspl123456789".padEnd(43, "0"),
    },
  },
};

export const transactionWithInnerInstructions: RpcTransaction = {
  ...successfulSolTransfer,
  slot: 123456791,
  transaction: {
    signatures: [INNER_IX_SIGNATURE],
    message: {
      accountKeys: [
        { pubkey: alice, signer: true, writable: true },
        { pubkey: bob, signer: false, writable: true },
        { pubkey: carol, signer: false, writable: true },
        { pubkey: SYSTEM, signer: false, writable: false },
      ],
      instructions: [
        {
          programId: SYSTEM,
          program: "system",
          parsed: {
            type: "createAccount",
            info: { source: alice, newAccount: bob, lamports: 1000000 },
          },
        },
      ],
      recentBlockhash: "blockhashinner123456789".padEnd(43, "0"),
    },
  },
  meta: {
    ...successfulSolTransfer.meta,
    err: null,
    preBalances: [2000000, 0, 0],
    postBalances: [900000, 1000000, 100000],
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            programId: SYSTEM,
            program: "system",
            parsed: {
              type: "transfer",
              info: { source: alice, destination: carol, lamports: 100000 },
            },
          },
        ],
      },
    ],
    logMessages: [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 invoke [2]",
      "Program 11111111111111111111111111111111 success",
      "Program 11111111111111111111111111111111 success",
    ],
  },
};

export const versionedTransaction: RpcTransaction = {
  slot: 123456792,
  blockTime: 1700000002,
  version: 0,
  meta: {
    err: null,
    fee: 5000,
    preBalances: [100000000, 0],
    postBalances: [99995000, 5000],
    preTokenBalances: [],
    postTokenBalances: [],
    innerInstructions: [],
    loadedAddresses: { writable: [lookupAddr], readonly: [] },
    logMessages: [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 success",
    ],
  },
  transaction: {
    signatures: [VERSIONED_SIGNATURE],
    message: {
      accountKeys: [
        { pubkey: alice, signer: true, writable: true },
        { pubkey: bob, signer: false, writable: true },
      ],
      addressTableLookups: [
        { accountKey: lookupTable, writableIndexes: [0], readonlyIndexes: [] },
      ],
      instructions: [
        {
          programIdIndex: 2,
          accounts: [0, 1],
          data: "3Bgs4FKg1s",
        },
      ],
      recentBlockhash: "blockhashv0123456789".padEnd(43, "0"),
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
    },
  },
};

export const allFixtures: Record<string, RpcTransaction> = {
  [SOL_TRANSFER_SIGNATURE]: successfulSolTransfer,
  [FAILED_TX_SIGNATURE]: failedTransaction,
  [SPL_TRANSFER_SIGNATURE]: splTransfer,
  [INNER_IX_SIGNATURE]: transactionWithInnerInstructions,
  [VERSIONED_SIGNATURE]: versionedTransaction,
};
