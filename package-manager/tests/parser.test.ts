import { describe, expect, it } from "vitest";
import { TransactionParser } from "../parser/TransactionParser.js";
import {
  successfulSolTransfer,
  failedTransaction,
  splTransfer,
  transactionWithInnerInstructions,
  versionedTransaction,
  SOL_TRANSFER_SIGNATURE,
  FAILED_TX_SIGNATURE,
  SPL_TRANSFER_SIGNATURE,
  INNER_IX_SIGNATURE,
  VERSIONED_SIGNATURE,
  lookupAddr,
} from "./fixtures.js";

describe("TransactionParser", () => {
  it("parses a successful SOL transfer", () => {
    const parsed = TransactionParser.parse(SOL_TRANSFER_SIGNATURE, successfulSolTransfer);
    expect(parsed.success).toBe(true);
    expect(parsed.fee).toBe(5000n);
    expect(parsed.transfers).toHaveLength(1);
    expect(parsed.transfers[0]?.lamports).toBe(5000n);
    expect(parsed.transfers[0]?.sol).toBe("0.000005");
    expect(parsed.programs).toContain("11111111111111111111111111111111");
    expect(parsed.accountKeys).toHaveLength(3);
  });

  it("marks failed transactions as unsuccessful", () => {
    const parsed = TransactionParser.parse(FAILED_TX_SIGNATURE, failedTransaction);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeTruthy();
  });

  it("parses an SPL transfer with mint and decimals", () => {
    const parsed = TransactionParser.parse(SPL_TRANSFER_SIGNATURE, splTransfer);
    expect(parsed.success).toBe(true);
    expect(parsed.tokenTransfers).toHaveLength(1);
    const transfer = parsed.tokenTransfers[0];
    expect(transfer?.mint).toBe("MintPubkey111111111111111111111111111111111");
    expect(transfer?.amount).toBe("100000000");
    expect(transfer?.decimals).toBe(6);
    expect(transfer?.uiAmount).toBe("100");
  });

  it("parses inner instructions", () => {
    const parsed = TransactionParser.parse(INNER_IX_SIGNATURE, transactionWithInnerInstructions);
    const topLevel = parsed.instructions[0];
    expect(topLevel?.inner).toHaveLength(1);
    expect(topLevel?.inner[0]?.type).toBe("transfer");
    expect(parsed.transfers).toHaveLength(2);
    expect(parsed.transfers.some((t) => t.inner)).toBe(true);
  });

  it("handles versioned transactions and lookup tables", () => {
    const parsed = TransactionParser.parse(VERSIONED_SIGNATURE, versionedTransaction);
    expect(parsed.version).toBe(0);
    expect(TransactionParser.usesLookupTables(versionedTransaction)).toBe(true);
    expect(parsed.accountKeys).toContain(lookupAddr);
    expect(parsed.programs).toContain("11111111111111111111111111111111");
  });
});
