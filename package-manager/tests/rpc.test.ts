import { describe, expect, it } from "vitest";
import { MockRpcProvider } from "../rpc/MockRpcProvider.js";
import { RpcClient } from "../rpc/RpcClient.js";
import { RpcError } from "../errors/index.js";

describe("RpcClient", () => {
  it("calls getBalance and returns bigint-friendly value", async () => {
    const provider = new MockRpcProvider({
      getBalance: { context: { slot: 1 }, value: 1_000_000_000 },
    });
    const rpc = new RpcClient({ provider });
    const result = await rpc.getBalance("11111111111111111111111111111111");
    expect(result.value).toBe(1_000_000_000);
    expect(provider.calls[0]?.method).toBe("getBalance");
  });

  it("raw request escape hatch works", async () => {
    const provider = new MockRpcProvider({ getVersion: { "solana-core": "1.18.0" } });
    const rpc = new RpcClient({ provider });
    const version = await rpc.request<{ "solana-core": string }>("getVersion", []);
    expect(version["solana-core"]).toBe("1.18.0");
  });

  it("propagates RPC errors without swallowing", async () => {
    const provider = new MockRpcProvider({
      getAccountInfo: undefined,
    });
    provider.set("getAccountInfo", () => {
      throw new RpcError({ method: "getAccountInfo", message: "Invalid param" });
    });
    const rpc = new RpcClient({ provider });
    await expect(rpc.getAccountInfo("bad")).rejects.toThrow(RpcError);
  });

  it("records every call", async () => {
    const provider = new MockRpcProvider({
      getSlot: 42,
      getBlockHeight: 42,
    });
    const rpc = new RpcClient({ provider });
    await rpc.getSlot();
    await rpc.getBlockHeight();
    expect(provider.calls.map((call) => call.method)).toEqual(["getSlot", "getBlockHeight"]);
  });
});
