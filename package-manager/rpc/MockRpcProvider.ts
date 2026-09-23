import { RpcError } from "../errors/index";
import type { SolanaRpcProvider } from "./RpcProvider";

export type MockHandler = (params: readonly unknown[]) => unknown;

/**
 * Deterministic provider for tests and offline demos.
 *
 * Register either a fixed value or a handler per RPC method. Every call is
 * recorded so tests can assert on what the SDK actually asked the node.
 */
export class MockRpcProvider implements SolanaRpcProvider {
  public readonly name = "mock";
  public readonly endpoint = "mock://localhost";
  public readonly calls: Array<{ method: string; params: readonly unknown[] }> = [];

  private readonly handlers = new Map<string, MockHandler>();

  constructor(fixtures: Readonly<Record<string, unknown>> = {}) {
    for (const [method, value] of Object.entries(fixtures)) {
      this.set(method, value);
    }
  }

  public set(method: string, value: unknown | MockHandler): this {
    this.handlers.set(
      method,
      typeof value === "function" ? (value as MockHandler) : () => value,
    );
    return this;
  }

  public async request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
    this.calls.push({ method, params });
    const handler = this.handlers.get(method);
    if (!handler) {
      throw new RpcError({ method, message: "no mock fixture registered for this method" });
    }
    const result = handler(params);
    return (result instanceof Promise ? await result : result) as T;
  }
}
