import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { buildClient, saveConfig, usePlaygroundConfig } from "../../lib/playground-config";
import { ConfigCard } from "./ConfigCard";
import { AccountLookup, Explorer, PaymentCard, PdaCard, RpcCard, TokenCard, TradingCard } from "./tools";

export function ToolPanel({ id, live }: { id: string; live: boolean }) {
  const config = usePlaygroundConfig();
  const client = useMemo(() => buildClient(config), [config]);
  const network = config.network;
  const k = `${id}-${network}-${client.providerName}`;
  if (id === "configurations") return <ConfigCard />;
  return (
    <div className="space-y-4">
      {live ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            Network
            <select
              aria-label="Network"
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
              value={network}
              onChange={(e) => saveConfig({ network: e.target.value === "mainnet" ? "mainnet" : "devnet" })}
            >
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet (read-only)</option>
            </select>
          </label>
          <span className="font-mono text-xs">provider: {client.providerName}</span>
          <Link to="/docs/playground/$tool" params={{ tool: "configurations" }} className="text-xs text-primary hover:underline">
            Edit configuration
          </Link>
        </div>
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
