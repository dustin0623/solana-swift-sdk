import { SubscriptionError } from "../../errors/index";
import type { RpcClient } from "../../rpc/RpcClient";
import type {
  RpcSubscriptionHandle,
  SolanaRpcSubscriptionProvider,
} from "../../rpc/RpcProvider";
import type { Address, Commitment, Signature } from "../../types/index";
import { assertAddress } from "../../utils/address";
import { AccountReader } from "../AccountReader";

export interface Subscription {
  readonly id: number | null;
  unsubscribe(): Promise<void>;
}

export interface StreamOptions {
  commitment?: Commitment;
}

export interface SlotEvent {
  slot: number;
  parent: number;
  root: number;
}

export interface LogsEvent {
  signature: Signature;
  slot: number | null;
  err: unknown;
  logs: string[];
}

export interface AccountEvent {
  address: Address;
  slot: number;
  lamports: bigint;
  owner: Address;
  data: Uint8Array;
  parsed: unknown;
  raw: unknown;
}

export interface ProgramAccountEvent extends AccountEvent {
  programId: Address;
}

/**
 * One coordinated streaming layer over the Solana websocket.
 *
 * All subscriptions share a single socket, which reconnects and re-subscribes
 * automatically. A websocket can always miss notifications across a
 * disconnect, so the engine tracks the highest slot it has seen and exposes
 * `reconcile()` so consumers can catch up over RPC rather than assuming the
 * stream was gap-free.
 */
export class StreamEngine {
  /** Highest slot observed on any subscription. */
  public lastSeenSlot = 0;

  private readonly handles = new Set<RpcSubscriptionHandle>();
  private readonly seenSignatures = new Set<string>();

  constructor(
    private readonly rpc: RpcClient,
    private readonly provider: SolanaRpcSubscriptionProvider | null,
    private readonly defaultCommitment: Commitment = "confirmed",
  ) {}

  public get available(): boolean {
    return this.provider !== null;
  }

  /* ── Subscriptions ─────────────────────────────────────────────────── */

  public slots(onEvent: (event: SlotEvent) => void): Promise<Subscription> {
    return this.open("slotSubscribe", [], (payload) => {
      const event = payload as SlotEvent;
      this.track(event.slot);
      onEvent(event);
    });
  }

  public account(
    address: Address,
    onEvent: (event: AccountEvent) => void,
    options: StreamOptions = {},
  ): Promise<Subscription> {
    const target = assertAddress(address);
    return this.open(
      "accountSubscribe",
      [target, { encoding: "base64", commitment: options.commitment ?? this.defaultCommitment }],
      (payload) => {
        const notification = payload as {
          context: { slot: number };
          value: Parameters<typeof AccountReader.normalize>[0];
        };
        this.track(notification.context.slot);
        const account = AccountReader.normalize(notification.value);
        onEvent({
          address: target,
          slot: notification.context.slot,
          lamports: account.lamports,
          owner: account.owner,
          data: account.data,
          parsed: account.parsed,
          raw: notification,
        });
      },
    );
  }

  public program(
    programId: Address,
    onEvent: (event: ProgramAccountEvent) => void,
    options: StreamOptions & { filters?: readonly unknown[] } = {},
  ): Promise<Subscription> {
    const target = assertAddress(programId, "programId");
    return this.open(
      "programSubscribe",
      [
        target,
        {
          encoding: "base64",
          commitment: options.commitment ?? this.defaultCommitment,
          ...(options.filters ? { filters: options.filters } : {}),
        },
      ],
      (payload) => {
        const notification = payload as {
          context: { slot: number };
          value: { pubkey: string; account: Parameters<typeof AccountReader.normalize>[0] };
        };
        this.track(notification.context.slot);
        const account = AccountReader.normalize(notification.value.account);
        onEvent({
          programId: target,
          address: notification.value.pubkey as Address,
          slot: notification.context.slot,
          lamports: account.lamports,
          owner: account.owner,
          data: account.data,
          parsed: account.parsed,
          raw: notification,
        });
      },
    );
  }

  /**
   * Log stream. `filter` is "all", "allWithVotes" or a mentions filter.
   * Duplicate signatures are suppressed within this engine instance.
   */
  public logs(
    filter: "all" | "allWithVotes" | { mentions: Address[] },
    onEvent: (event: LogsEvent) => void,
    options: StreamOptions = {},
  ): Promise<Subscription> {
    return this.open(
      "logsSubscribe",
      [filter, { commitment: options.commitment ?? this.defaultCommitment }],
      (payload) => {
        const notification = payload as {
          context: { slot: number };
          value: { signature: string; err: unknown; logs: string[] };
        };
        this.track(notification.context.slot);
        if (this.seen(notification.value.signature)) return;
        onEvent({
          signature: notification.value.signature,
          slot: notification.context.slot ?? null,
          err: notification.value.err ?? null,
          logs: notification.value.logs ?? [],
        });
      },
    );
  }

  /** Fires once when the signature reaches the requested commitment. */
  public signature(
    signature: Signature,
    onEvent: (event: { signature: Signature; slot: number; err: unknown }) => void,
    options: StreamOptions = {},
  ): Promise<Subscription> {
    return this.open(
      "signatureSubscribe",
      [signature, { commitment: options.commitment ?? this.defaultCommitment }],
      (payload) => {
        const notification = payload as { context: { slot: number }; value: { err: unknown } };
        this.track(notification.context.slot);
        onEvent({
          signature,
          slot: notification.context.slot,
          err: notification.value?.err ?? null,
        });
      },
    );
  }

  /* ── Recovery ──────────────────────────────────────────────────────── */

  /**
   * Fetches signatures for an address that the stream may have missed while
   * disconnected. Websocket delivery is not a durability guarantee, so this
   * RPC-based reconciliation is the supported way to close gaps.
   */
  public async reconcile(
    address: Address,
    options: { since?: Signature; limit?: number } = {},
  ): Promise<Signature[]> {
    const records = await this.rpc.getSignaturesForAddress(assertAddress(address), {
      limit: options.limit ?? 50,
      ...(options.since ? { until: options.since } : {}),
    });
    return records
      .map((record) => record.signature)
      .filter((signature) => !this.seen(signature));
  }

  /** Closes every subscription this engine owns. */
  public async close(): Promise<void> {
    await Promise.all([...this.handles].map((handle) => handle.unsubscribe().catch(() => undefined)));
    this.handles.clear();
    this.seenSignatures.clear();
    this.provider?.close();
  }

  private track(slot: number | undefined): void {
    if (typeof slot === "number" && slot > this.lastSeenSlot) this.lastSeenSlot = slot;
  }

  private seen(signature: string): boolean {
    if (this.seenSignatures.has(signature)) return true;
    this.seenSignatures.add(signature);
    // Bounded memory: the set only guards against immediate duplicates.
    if (this.seenSignatures.size > 5_000) {
      const oldest = this.seenSignatures.values().next().value;
      if (oldest) this.seenSignatures.delete(oldest);
    }
    return false;
  }

  private async open(
    method: string,
    params: readonly unknown[],
    onNotification: (payload: unknown) => void,
  ): Promise<Subscription> {
    if (!this.provider) {
      throw new SubscriptionError(
        "Streaming is not configured — pass rpc.wsUrl or use a network with websocket support",
      );
    }
    const handle = await this.provider.subscribe(method, params, onNotification);
    this.handles.add(handle);
    return {
      get id() {
        return handle.id;
      },
      unsubscribe: async () => {
        this.handles.delete(handle);
        await handle.unsubscribe();
      },
    };
  }
}
