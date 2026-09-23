import { describe, expect, it, vi } from "vitest";
import { SolanaClient } from "../core/SolanaClient.js";
import { endpointsFor, deriveWsUrl } from "../core/networks.js";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { HttpRpcProvider } from "../rpc/HttpRpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { StreamEngine } from "../reader/stream/StreamEngine.js";
import { HeliusRpcProvider } from "../providers/helius/HeliusRpcProvider.js";
import { TransactionBuilder, assertSimulationSucceeded } from "../builder/TransactionBuilder.js";
import { BuilderClient } from "../builder/BuilderClient.js";
import { KeypairSigner } from "../wallet/KeypairSigner.js";
import { ConfigurationError, SimulationError } from "../errors/index.js";
import type { SolanaRpcSubscriptionProvider } from "../rpc/RpcProvider.js";
import {
  alice,
  bob,
  successfulSolTransfer,
  SOL_TRANSFER_SIGNATURE,
  multipleTransfers,
  programInvocation,
  tokenMint,
  tokenBurn,
} from "./fixtures.js";

const blockhash = "EETjtPHe51AHgNzjtMzCkqy4JLR1yo5xUhRGPC9NtER4";

describe("network configuration", () => {
  it("defaults to public mainnet RPC with no API key", () => {
    const client = new SolanaClient();
    expect(client.network).toBe("mainnet");
    expect(endpointsFor("mainnet").http).toContain("solana.com");
  });

  it("supports devnet/testnet and rejects unknown networks", () => {
    expect(new SolanaClient({ network: "devnet" }).network).toBe("devnet");
    expect(new SolanaClient({ network: "testnet" }).network).toBe("testnet");
    expect(() => new SolanaClient({ network: "moon" as never })).toThrow(ConfigurationError);
  });

  it("derives websocket urls from http urls", () => {
    expect(deriveWsUrl("https://rpc.example.com")).toBe("wss://rpc.example.com/");
  });
});

describe("provider switching", () => {
  it("custom rpc url, Helius and mock all expose the same client API", async () => {
    const custom = new SolanaClient({ rpc: { url: "https://my-node.example", name: "private" } });
    expect(custom.providerName).toBe("private");

    const helius = new SolanaClient({
      provider: new HeliusRpcProvider({ url: "https://mainnet.helius-rpc.com/?api-key=x" }),
    });
    expect(helius.providerName).toBe("helius");

    const mock = new SolanaClient({
      provider: new MockRpcProvider({ getBalance: { context: { slot: 1 }, value: 5 } }),
    });
    const balance = await mock.reader.balance(alice);
    expect(balance.lamports).toBe(5n);
    // Same modules regardless of provider.
    for (const c of [custom, helius, mock]) {
      expect(c.reader).toBeDefined();
      expect(c.parser).toBeDefined();
      expect(c.blocks).toBe(c.reader.blocks);
      expect(c.wallet).toBeDefined();
    }
  });
});

describe("commitment handling", () => {
  it("uses the configured default commitment", async () => {
    const provider = new MockRpcProvider({ getSlot: 1 });
    const rpc = new RpcClient({ provider, defaultCommitment: "finalized" });
    await rpc.getSlot();
    expect(JSON.stringify(provider.calls[0]?.params)).toContain("finalized");
  });

  it("per-call commitment overrides the default", async () => {
    const provider = new MockRpcProvider({ getSlot: 1 });
    const rpc = new RpcClient({ provider, defaultCommitment: "finalized" });
    await rpc.getSlot({ commitment: "processed" });
    expect(JSON.stringify(provider.calls[0]?.params)).toContain("processed");
  });
});

describe("retry safety", () => {
  it("retries reads on transport failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValue(new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: 7 })));
    const provider = new HttpRpcProvider({ url: "https://x", fetchImpl, maxRetries: 2 });
    await expect(provider.request<number>("getSlot")).resolves.toBe(7);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("never retries sendTransaction", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("network down"));
    const provider = new HttpRpcProvider({ url: "https://x", fetchImpl, maxRetries: 5 });
    await expect(provider.request("sendTransaction", ["abc"])).rejects.toBeDefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("simulation", () => {
  it("reports success and logs without broadcasting", async () => {
    const provider = new MockRpcProvider({
      simulateTransaction: {
        context: { slot: 1 },
        value: { err: null, logs: ["Program log: ok"], unitsConsumed: 150 },
      },
    });
    const rpc = new RpcClient({ provider });
    const signer = KeypairSigner.generate();
    const tx = await new TransactionBuilder(rpc)
      .feePayer(signer.address)
      .transfer({ to: bob, lamports: 1n })
      .withBlockhash(blockhash)
      .build();
    const result = await new BuilderClient(rpc).simulate(tx);
    expect(result.success).toBe(true);
    expect(result.logs).toEqual(["Program log: ok"]);
    expect(provider.calls.map((c) => c.method)).not.toContain("sendTransaction");
  });

  it("surfaces failed simulations as SimulationError", () => {
    expect(() =>
      assertSimulationSucceeded({
        success: false,
        error: { InstructionError: [0, "Custom"] },
        logs: ["failed"],
        unitsConsumed: null,
        returnData: null,
        raw: null,
      }),
    ).toThrow(SimulationError);
  });
});

class FakeSubscriptions implements SolanaRpcSubscriptionProvider {
  public readonly wsEndpoint = "wss://fake";
  public readonly listeners = new Map<string, (payload: unknown) => void>();
  public unsubscribed = 0;
  public closed = false;
  public async subscribe(
    method: string,
    _params: readonly unknown[],
    onNotification: (payload: unknown) => void,
  ): Promise<{ id: number; unsubscribe(): Promise<void> }> {
    this.listeners.set(method, onNotification);
    return {
      id: this.listeners.size,
      unsubscribe: async () => {
        this.unsubscribed += 1;
        this.listeners.delete(method);
      },
    };
  }
  public close(): void {
    this.closed = true;
  }
}

describe("StreamEngine", () => {
  it("deduplicates log events and tracks the highest slot", async () => {
    const subs = new FakeSubscriptions();
    const engine = new StreamEngine(new RpcClient({ provider: new MockRpcProvider() }), subs);
    const events: string[] = [];
    await engine.logs("all", (e) => events.push(e.signature));
    const emit = subs.listeners.get("logsSubscribe")!;
    emit({ context: { slot: 10 }, value: { signature: "a", err: null, logs: [] } });
    emit({ context: { slot: 11 }, value: { signature: "a", err: null, logs: [] } });
    emit({ context: { slot: 12 }, value: { signature: "b", err: null, logs: [] } });
    expect(events).toEqual(["a", "b"]);
    expect(engine.lastSeenSlot).toBe(12);
  });

  it("unsubscribes and cleans up on close", async () => {
    const subs = new FakeSubscriptions();
    const engine = new StreamEngine(new RpcClient({ provider: new MockRpcProvider() }), subs);
    const sub = await engine.slots(() => undefined);
    await engine.signature(SOL_TRANSFER_SIGNATURE, () => undefined);
    await sub.unsubscribe();
    await engine.close();
    expect(subs.unsubscribed).toBeGreaterThanOrEqual(2);
    expect(subs.closed).toBe(true);
  });

  it("reconciles missed signatures over RPC", async () => {
    const provider = new MockRpcProvider({
      getSignaturesForAddress: [
        { signature: "x", slot: 1, err: null, blockTime: null, memo: null },
        { signature: "y", slot: 2, err: null, blockTime: null, memo: null },
      ],
    });
    const engine = new StreamEngine(new RpcClient({ provider }), new FakeSubscriptions());
    expect(await engine.reconcile(alice)).toEqual(["x", "y"]);
    // Already seen now — not returned again.
    expect(await engine.reconcile(alice)).toEqual([]);
  });

  it("reports unavailable when no websocket provider exists", () => {
    const engine = new StreamEngine(new RpcClient({ provider: new MockRpcProvider() }), null);
    expect(engine.available).toBe(false);
  });
});

describe("additional fixtures", () => {
  const client = new SolanaClient({ provider: new MockRpcProvider() });
  it("parses multiple SOL transfers", () => {
    const tx = client.parser.transaction("multi", multipleTransfers);
    expect(tx.transfers.length).toBe(2);
  });
  it("records program invocations from logs and instructions", () => {
    const tx = client.parser.transaction("prog", programInvocation);
    expect(tx.programs.length).toBeGreaterThan(0);
    expect(tx.logs.some((l) => l.includes("invoke"))).toBe(true);
  });
  it("keeps mint and burn instructions with raw data", () => {
    const minted = client.parser.transaction("mint", tokenMint);
    const burned = client.parser.transaction("burn", tokenBurn);
    expect(minted.instructions.length).toBe(1);
    expect(burned.instructions.length).toBe(1);
    expect(minted.raw).toBe(tokenMint);
  });
  it("reads via reader.transaction the same shape as parser", async () => {
    const c = new SolanaClient({
      provider: new MockRpcProvider({ getTransaction: successfulSolTransfer }),
    });
    const tx = await c.reader.transaction(SOL_TRANSFER_SIGNATURE);
    expect(tx?.success).toBe(true);
  });
});
