import { describe, expect, it } from "vitest";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { TransactionBuilder } from "../builder/TransactionBuilder.js";
import { KeypairSigner } from "../wallet/KeypairSigner.js";
import { InstructionBuilder } from "../builder/InstructionBuilder.js";
import { assertSimulationSucceeded } from "../builder/TransactionBuilder.js";
import { solToLamports } from "../utils/amount.js";

const alice = KeypairSigner.generate();
const bob = "11111111111111111111111111111112";
const blockhash = "EETjtPHe51AHgNzjtMzCkqy4JLR1yo5xUhRGPC9NtER4";

describe("TransactionBuilder", () => {
  it("compiles a legacy SOL transfer message", async () => {
    const provider = new MockRpcProvider({});
    const rpc = new RpcClient({ provider });
    const tx = await new TransactionBuilder(rpc)
      .feePayer(alice.address)
      .transfer({ to: bob, lamports: solToLamports("0.1") })
      .withBlockhash(blockhash)
      .build();

    expect(tx.message.version).toBe("legacy");
    expect(tx.message.accountKeys).toContain(alice.address);
    expect(tx.message.accountKeys).toContain(bob);
    expect(tx.isFullySigned()).toBe(false);

    const signed = await tx.signatures.set(alice.address, await alice.signMessageBytes(tx.message.bytes));
    expect(tx.isFullySigned()).toBe(true);
    expect(tx.serialize()).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("requires a fee payer", async () => {
    const provider = new MockRpcProvider({});
    const rpc = new RpcClient({ provider });
    await expect(
      new TransactionBuilder(rpc).transfer({ to: bob, lamports: 100n }).withBlockhash(blockhash).build(),
    ).rejects.toThrow();
  });

  it("can add custom instructions", async () => {
    const provider = new MockRpcProvider({});
    const rpc = new RpcClient({ provider });
    const memo = InstructionBuilder.memo("hello");
    const tx = await new TransactionBuilder(rpc)
      .feePayer(alice.address)
      .add(memo)
      .withBlockhash(blockhash)
      .build();

    expect(tx.message.accountKeys).toContain(InstructionBuilder.memo("x").programId);
  });

  it("creates associated token account instruction", () => {
    const ix = InstructionBuilder.createAssociatedTokenAccount({
      payer: alice.address,
      owner: bob,
      mint: "MintPubkey111111111111111111111111111111111",
    });
    expect(ix.programId).toBe("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    expect(ix.keys[0]?.isSigner).toBe(true);
  });

  it("computes ATA deterministically", () => {
    const ata1 = InstructionBuilder.associatedTokenAddress(
      alice.address,
      "MintPubkey111111111111111111111111111111111",
    );
    const ata2 = InstructionBuilder.associatedTokenAddress(
      alice.address,
      "MintPubkey111111111111111111111111111111111",
    );
    expect(ata1).toBe(ata2);
  });
});
