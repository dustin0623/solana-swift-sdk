import { useMemo, useState } from "react";
import { SolanaClient } from "@solanaxph-sdk";
import {
  AccountLookup,
  Explorer,
  PaymentCard,
  PdaCard,
  RpcCard,
  TokenCard,
  TradingCard,
  type LiveNetwork,
} from "./tools";

export function ToolPanel({ id, live }: { id: string; live: boolean }) {
  const [network, setNetwork] = useState<LiveNetwork>("devnet");
  const client = useMemo(() => new SolanaClient({ network }), [network]);
  const k = `${id}-${network}`;
  return (
    <div className="space-y-4">
      {live ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Network
          <select
            aria-label="Network"
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            value={network}
            onChange={(e) => setNetwork(e.target.value === "mainnet" ? "mainnet" : "devnet")}
          >
            <option value="devnet">devnet</option>
            <option value="mainnet">mainnet (read-only)</option>
          </select>
        </label>
      ) : (
        <p className="text-xs text-muted-foreground">Runs on fixture data and a mock RPC. Nothing is broadcast.</p>
      )}
      {id === "rpc" && <RpcCard key={k} client={client} />}
      {id === "accounts" && <AccountLookup key={k} client={client} />}
      {id === "transactions" && <Explorer key={k} client={client} />}
      {id === "tokens" && <TokenCard key={k} client={client} network={network} />}
      {id === "payments" && <PaymentCard />}
      {id === "trading" && <TradingCard />}
      {id === "pdas" && <PdaCard />}
    </div>
  );
}
