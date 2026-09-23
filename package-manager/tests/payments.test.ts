import { describe, expect, it } from "vitest";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { ReaderClient } from "../reader/ReaderClient.js";
import { PaymentValidator } from "../payments/PaymentValidator.js";
import { successfulSolTransfer, SOL_TRANSFER_SIGNATURE, splTransfer, SPL_TRANSFER_SIGNATURE } from "./fixtures.js";
import { MintClient } from "../tokens/MintClient.js";

describe("PaymentValidator", () => {
  it("validates a matching SOL payment", async () => {
    const provider = new MockRpcProvider({
      getTransaction: successfulSolTransfer,
      getSignatureStatuses: {
        context: { slot: 1 },
        value: [
          {
            slot: 123456789,
            confirmations: null,
            confirmationStatus: "finalized",
            err: null,
          },
        ],
      },
    });
    const rpc = new RpcClient({ provider, defaultCommitment: "finalized" });
    const reader = new ReaderClient(rpc);
    const validator = new PaymentValidator(reader.transactions, new MintClient(rpc));

    const result = await validator.validate({
      signature: SOL_TRANSFER_SIGNATURE,
      expected: {
        from: "AlicePubkey111111111111111111111111111111111",
        to: "BobPubkey111111111111111111111111111111111111",
        amount: "0.000005",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.receivedAmount).toBe("5000");
  });

  it("rejects a payment with wrong amount", async () => {
    const provider = new MockRpcProvider({
      getTransaction: successfulSolTransfer,
      getSignatureStatuses: {
        context: { slot: 1 },
        value: [{ slot: 123456789, confirmations: null, confirmationStatus: "finalized", err: null }],
      },
    });
    const rpc = new RpcClient({ provider, defaultCommitment: "finalized" });
    const reader = new ReaderClient(rpc);
    const validator = new PaymentValidator(reader.transactions, new MintClient(rpc));

    const result = await validator.validate({
      signature: SOL_TRANSFER_SIGNATURE,
      expected: {
        to: "BobPubkey111111111111111111111111111111111111",
        amount: "999999",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("Amount mismatch"))).toBe(true);
  });

  it("validates an SPL transfer", async () => {
    const provider = new MockRpcProvider({
      getTransaction: splTransfer,
      getSignatureStatuses: {
        context: { slot: 1 },
        value: [{ slot: 123456790, confirmations: null, confirmationStatus: "finalized", err: null }],
      },
      getAccountInfo: {
        context: { slot: 1 },
        value: {
          owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          lamports: 1461600,
          data: { parsed: { type: "mint", info: { decimals: 6, supply: "1000000000000" } }, program: "spl-token", space: 82 },
          executable: false,
          rentEpoch: 0,
        },
      },
    });
    const rpc = new RpcClient({ provider, defaultCommitment: "finalized" });
    const reader = new ReaderClient(rpc);
    const validator = new PaymentValidator(reader.transactions, new MintClient(rpc));

    const result = await validator.validate({
      signature: SPL_TRANSFER_SIGNATURE,
      expected: {
        mint: "MintPubkey111111111111111111111111111111111",
        to: "BobPubkey111111111111111111111111111111111111",
        amount: "100",
      },
    });

    expect(result.valid).toBe(true);
    expect(result.receivedAmount).toBe("100000000");
  });
});
