import { SubscriptionError } from "../errors/index.js";
import type {
  RpcSubscriptionHandle,
  SolanaRpcSubscriptionProvider,
} from "./RpcProvider.js";

type WebSocketFactory = (url: string) => WebSocket;

export interface WebSocketRpcProviderOptions {
  url: string;
  /** Milliseconds between reconnect attempts; grows up to maxBackoffMs. */
  backoffMs?: number;
  maxBackoffMs?: number;
  webSocketFactory?: WebSocketFactory;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface ActiveSubscription {
  method: string;
  params: readonly unknown[];
  onNotification: (payload: unknown) => void;
  /** Server subscription id, null while (re)subscribing. */
  serverId: number | null;
  closed: boolean;
}

/**
 * Solana websocket transport with automatic reconnection.
 *
 * Reconnects re-issue every live subscription. A websocket gap can always
 * drop notifications, so consumers reconcile through RPC — see StreamEngine.
 */
export class WebSocketRpcProvider implements SolanaRpcSubscriptionProvider {
  public readonly wsEndpoint: string;

  private socket: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly subscriptions = new Map<number, ActiveSubscription>();
  private readonly serverIdToLocal = new Map<number, number>();
  private nextRequestId = 1;
  private nextLocalId = 1;
  private attempts = 0;
  private disposed = false;

  private readonly backoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly factory: WebSocketFactory;

  constructor(options: WebSocketRpcProviderOptions) {
    this.wsEndpoint = options.url;
    this.backoffMs = options.backoffMs ?? 500;
    this.maxBackoffMs = options.maxBackoffMs ?? 15_000;
    this.factory =
      options.webSocketFactory ??
      ((url: string) => {
        const Ctor = (globalThis as { WebSocket?: new (url: string) => WebSocket }).WebSocket;
        if (!Ctor) {
          throw new SubscriptionError(
            "No WebSocket implementation in this runtime — pass webSocketFactory",
          );
        }
        return new Ctor(url);
      });
  }

  public async subscribe(
    method: string,
    params: readonly unknown[],
    onNotification: (payload: unknown) => void,
  ): Promise<RpcSubscriptionHandle> {
    const localId = this.nextLocalId++;
    const subscription: ActiveSubscription = {
      method,
      params,
      onNotification,
      serverId: null,
      closed: false,
    };
    this.subscriptions.set(localId, subscription);

    await this.connect();
    await this.issue(localId, subscription);

    return {
      get id() {
        return subscription.serverId;
      },
      unsubscribe: async () => {
        await this.unsubscribe(localId);
      },
    };
  }

  public close(): void {
    this.disposed = true;
    for (const sub of this.subscriptions.values()) sub.closed = true;
    this.subscriptions.clear();
    this.serverIdToLocal.clear();
    this.socket?.close();
    this.socket = null;
  }

  private async unsubscribe(localId: number): Promise<void> {
    const subscription = this.subscriptions.get(localId);
    if (!subscription) return;
    subscription.closed = true;
    this.subscriptions.delete(localId);

    const serverId = subscription.serverId;
    if (serverId !== null) {
      this.serverIdToLocal.delete(serverId);
      const unsubscribeMethod = subscription.method.replace("Subscribe", "Unsubscribe");
      try {
        await this.send(unsubscribeMethod, [serverId]);
      } catch {
        // The server drops subscriptions when the socket closes anyway.
      }
    }
    if (this.subscriptions.size === 0 && !this.disposed) {
      this.socket?.close();
      this.socket = null;
    }
  }

  private async issue(localId: number, subscription: ActiveSubscription): Promise<void> {
    const serverId = (await this.send(subscription.method, subscription.params)) as number;
    if (subscription.closed) {
      await this.send(subscription.method.replace("Subscribe", "Unsubscribe"), [serverId]).catch(
        () => undefined,
      );
      return;
    }
    subscription.serverId = serverId;
    this.serverIdToLocal.set(serverId, localId);
  }

  private connect(): Promise<void> {
    if (this.disposed) return Promise.reject(new SubscriptionError("Provider is closed"));
    if (this.socket && this.socket.readyState === 1) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      let socket: WebSocket;
      try {
        socket = this.factory(this.wsEndpoint);
      } catch (error) {
        this.connecting = null;
        reject(error instanceof Error ? error : new SubscriptionError("Cannot open websocket"));
        return;
      }
      this.socket = socket;

      socket.onopen = () => {
        this.attempts = 0;
        this.connecting = null;
        resolve();
      };
      socket.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
      socket.onerror = () => {
        // onclose always follows; reconnection is handled there.
      };
      socket.onclose = () => {
        this.socket = null;
        this.connecting = null;
        for (const [id, request] of this.pending) {
          request.reject(new SubscriptionError("Websocket closed before the response arrived"));
          this.pending.delete(id);
        }
        reject(new SubscriptionError("Websocket closed"));
        this.scheduleReconnect();
      };
    }).catch((error: unknown) => {
      this.connecting = null;
      throw error;
    });

    return this.connecting;
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.subscriptions.size === 0) return;
    const wait = Math.min(this.backoffMs * 2 ** this.attempts, this.maxBackoffMs);
    this.attempts += 1;
    setTimeout(() => {
      if (this.disposed || this.subscriptions.size === 0) return;
      void this.connect()
        .then(async () => {
          this.serverIdToLocal.clear();
          for (const [localId, subscription] of this.subscriptions) {
            subscription.serverId = null;
            await this.issue(localId, subscription).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }, wait);
  }

  private send(method: string, params: readonly unknown[]): Promise<unknown> {
    const socket = this.socket;
    if (!socket || socket.readyState !== 1) {
      return Promise.reject(new SubscriptionError("Websocket is not connected"));
    }
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") return;
    let message: {
      id?: number;
      result?: unknown;
      error?: { message: string };
      method?: string;
      params?: { subscription?: number; result?: unknown };
    };
    try {
      message = JSON.parse(data) as typeof message;
    } catch {
      return;
    }

    if (typeof message.id === "number") {
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new SubscriptionError(message.error.message));
      else request.resolve(message.result);
      return;
    }

    const serverId = message.params?.subscription;
    if (typeof serverId !== "number") return;
    const localId = this.serverIdToLocal.get(serverId);
    if (localId === undefined) return;
    const subscription = this.subscriptions.get(localId);
    if (!subscription || subscription.closed) return;
    subscription.onNotification(message.params?.result);
  }
}
