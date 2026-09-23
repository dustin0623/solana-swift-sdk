import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { DocShell } from "../components/DocShell";
import { CodeBlock } from "../components/CodeBlock";
import {
  MockRpcProvider,
  SolanaClient,
  findProgramAddress,
  lamportsToSol,
  KeypairSigner,
  type ParsedTransaction,
} from "@solanaxph-sdk";
import {
  alice,
  bob,
  mint,
  successfulSolTransfer,
  SOL_TRANSFER_SIGNATURE,
} from "@solanaxph-sdk/tests/fixtures";

export const Route = createFileRoute("/playground")({
  component: Playground,
  head: () => ({
    meta: [
      { title: "Playground — SolanaXPH SDK" },
      { name: "description", content: "Read-only Solana playground: parse live devnet/mainnet transactions, look up accounts and balances, derive PDAs and simulate payments." },
      { property: "og:title", content: "Playground — SolanaXPH SDK" },
      { property: "og:description", content: "Read-only Solana playground: parse live transactions, look up accounts, derive PDAs and simulate payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type LiveNetwork = "devnet" | "mainnet";

function stringify(value: unknown): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? `${v.toString()}n` : v), 2);
}

function Card({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <CodeBlock code={code} />
      {children}
    </div>
  );
}

function Output({ value }: { value: unknown }) {
  return (
    <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{stringify(value)}</pre>
  );
}

const btn =
  "inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono";

function useRunner(): {
  busy: boolean;
  result: unknown;
  error: string | null;
  run: (fn: () => Promise<unknown> | unknown) => Promise<void>;
} {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown> | unknown): Promise<void> => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, result, error, run };
}

function Status({ busy, result, error }: { busy: boolean; result: unknown; error: string | null }) {
  if (busy) return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="mt-3 text-sm text-destructive">{error}</p>;
  return result !== null ? <Output value={result} /> : null;
}

function Explorer({ client }: { client: SolanaClient }) {
  const [signature, setSignature] = useState("");
  const [tx, setTx] = useState<ParsedTransaction | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const r = useRunner();
  return (
    <Card
      title="Transaction explorer (read-only)"
      code={`const tx = await solana.reader.transaction(signature, { commitment: "confirmed" });`}
    >
      <p className="text-sm text-muted-foreground">
        Paste any transaction signature. Recent devnet signatures can be found on any Solana explorer.
      </p>
      <div className="mt-3 flex gap-2">
        <input className={input} value={signature} onChange={(e) => setSignature(e.target.value.trim())} placeholder="Transaction signature" aria-label="Transaction signature" />
        <button
          className={btn}
          disabled={!signature || r.busy}
          onClick={() =>
            void r.run(async () => {
              const parsed = await client.reader.transaction(signature, { commitment: "confirmed" });
              setTx(parsed);
              return parsed ? null : "Transaction not found at this commitment.";
            })
          }
        >
          Parse
        </button>
      </div>
      <Status {...r} />
      {tx ? (
        <div className="mt-4 space-y-2 text-sm">
          <dl className="grid grid-cols-[120px_1fr] gap-y-1">
            <dt className="text-muted-foreground">Status</dt>
            <dd className={tx.success ? "text-primary" : "text-destructive"}>{tx.success ? "Success" : `Failed ${stringify(tx.error)}`}</dd>
            <dt className="text-muted-foreground">Slot</dt><dd>{tx.slot}</dd>
            <dt className="text-muted-foreground">Block time</dt><dd>{tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "—"}</dd>
            <dt className="text-muted-foreground">Fee</dt><dd>{lamportsToSol(tx.fee)} SOL</dd>
            <dt className="text-muted-foreground">Version</dt><dd>{String(tx.version)}</dd>
          </dl>
          <h3 className="font-semibold">Programs</h3><Output value={tx.programs} />
          <h3 className="font-semibold">Instructions</h3><Output value={tx.instructions} />
          <h3 className="font-semibold">SOL transfers</h3><Output value={tx.transfers} />
          <h3 className="font-semibold">SPL transfers</h3><Output value={tx.tokenTransfers} />
          <h3 className="font-semibold">Logs</h3><Output value={tx.logs} />
          <button className="text-sm text-primary underline" onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "Hide" : "Show"} raw RPC response
          </button>
          {showRaw ? <Output value={tx.raw} /> : null}
        </div>
      ) : null}
    </Card>
  );
}

function AccountLookup({ client }: { client: SolanaClient }) {
  const [address, setAddress] = useState("");
  const r = useRunner();
  return (
    <Card title="Account & balance lookup" code={`await solana.reader.balance(address);\nawait solana.reader.account(address);`}>
      <div className="flex gap-2">
        <input className={input} value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="Wallet or account address" aria-label="Account address" />
        <button
          className={btn}
          disabled={!address || r.busy}
          onClick={() =>
            void r.run(async () => {
              const [balance, account] = await Promise.all([client.reader.balance(address), client.reader.account(address)]);
              return {
                sol: balance.sol,
                lamports: balance.lamports,
                owner: account?.owner ?? null,
                executable: account?.executable ?? null,
                dataBytes: account?.data.length ?? 0,
              };
            })
          }
        >
          Look up
        </button>
      </div>
      <Status {...r} />
    </Card>
  );
}

function RpcCard({ client }: { client: SolanaClient }) {
  const r = useRunner();
  return (
    <Card title="Raw RPC" code={`await solana.rpc.getSlot();\nawait solana.rpc.getEpochInfo();\nawait solana.rpc.request("getVersion", []);`}>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={r.busy} onClick={() => void r.run(() => client.rpc.getSlot())}>getSlot</button>
        <button className={btn} disabled={r.busy} onClick={() => void r.run(() => client.rpc.getEpochInfo())}>getEpochInfo</button>
        <button className={btn} disabled={r.busy} onClick={() => void r.run(() => client.rpc.request("getVersion", []))}>getVersion</button>
      </div>
      <Status {...r} />
    </Card>
  );
}

function TokenCard({ client, network }: { client: SolanaClient; network: LiveNetwork }) {
  const usdc = network === "mainnet" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  const [mintAddress, setMint] = useState(usdc);
  const [owner, setOwner] = useState("");
  const info = useRunner();
  const bal = useRunner();
  const supply = useRunner();
  return (
    <Card
      title="Token"
      code={`const token = await sdk.tokens.get(mint);   // decimals, supply, program\nconst b = await sdk.tokens.balance({ owner, mint });\nawait sdk.tokens.supply(mint);`}
    >
      <input className={input} value={mintAddress} onChange={(e) => setMint(e.target.value.trim())} aria-label="Mint address" placeholder="Mint address" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button className={btn} disabled={!mintAddress || info.busy} onClick={() => void info.run(async () => { const { raw: _raw, ...rest } = await client.tokens.get(mintAddress); return rest; })}>
          Get token
        </button>
        <button className={btn} disabled={!mintAddress || supply.busy} onClick={() => void supply.run(async () => (await client.tokens.supply(mintAddress)).amount)}>
          Supply
        </button>
      </div>
      <input className={`${input} mt-2`} value={owner} onChange={(e) => setOwner(e.target.value.trim())} aria-label="Wallet address" placeholder="Wallet address (optional)" />
      <button
        className={`${btn} mt-2`}
        disabled={!mintAddress || !owner || bal.busy}
        onClick={() => void bal.run(async () => (await client.tokens.balance({ owner, mint: mintAddress })).amount)}
      >
        Wallet balance
      </button>
      <Status {...info} />
      <Status {...supply} />
      <Status {...bal} />
    </Card>
  );
}

function PdaCard() {
  const [seed, setSeed] = useState("vault");
  const r = useRunner();
  return (
    <Card title="Derive a PDA" code={`findProgramAddress(["vault"], programId); // { address, bump }`}>
      <div className="flex gap-2">
        <input className={input} value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Seed" />
        <button className={btn} onClick={() => void r.run(() => findProgramAddress([seed], mint))}>Derive</button>
      </div>
      <Status {...r} />
    </Card>
  );
}

function PaymentCard() {
  const r = useRunner();
  const sim = useRunner();
  const mock = useMemo(
    () =>
      new SolanaClient({
        provider: new MockRpcProvider({
          getTransaction: successfulSolTransfer,
          getSignatureStatuses: {
            context: { slot: 1 },
            value: [{ slot: 123456789, confirmations: null, confirmationStatus: "finalized", err: null }],
          },
          getLatestBlockhash: {
            context: { slot: 1 },
            value: { blockhash: "EETjtPHe51AHgNzjtMzCkqy4JLR1yo5xUhRGPC9NtER4", lastValidBlockHeight: 100 },
          },
          simulateTransaction: {
            context: { slot: 1 },
            value: { err: null, logs: ["Program 11111111111111111111111111111111 invoke [1]", "Program 11111111111111111111111111111111 success"], unitsConsumed: 150 },
          },
        }),
      }),
    [],
  );
  return (
    <Card
      title="Payments (mock fixtures, never broadcast)"
      code={`const builder = solana.payments.sol.transfer({ from, to, amount: "0.1" });\nawait builder.simulate();\n\nawait solana.payments.validate({\n  signature,\n  expected: { from, to, amount: "0.000005" },\n  commitment: "finalized",\n});`}
    >
      <p className="text-sm text-muted-foreground">
        Uses a throwaway in-memory key and mock RPC. Nothing is signed with a real wallet or sent to any network.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className={btn}
          onClick={() =>
            void sim.run(async () => {
              const from = KeypairSigner.generate().address;
              return mock.payments.sol.transfer({ from, to: bob, amount: "0.1" }).simulate();
            })
          }
        >
          Build + simulate transfer
        </button>
        <button
          className={btn}
          onClick={() =>
            void r.run(() =>
              mock.payments.validate({
                signature: SOL_TRANSFER_SIGNATURE,
                expected: { from: alice, to: bob, amount: "0.000005" },
                commitment: "finalized",
              }),
            )
          }
        >
          Validate SOL payment
        </button>
      </div>
      <Status {...sim} />
      <Status {...r} />
    </Card>
  );
}

function Playground() {
  const [network, setNetwork] = useState<LiveNetwork>("devnet");
  const client = useMemo(() => new SolanaClient({ network }), [network]);
  return (
    <DocShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
          <p className="mt-1 text-muted-foreground">
            Read-only calls against public Solana RPC. No keys, no seed phrases, no broadcasts.
          </p>
        </div>
        <label className="text-sm">
          Network{" "}
          <select
            aria-label="Network"
            className="ml-2 rounded-md border border-border bg-background px-2 py-1"
            value={network}
            onChange={(e) => setNetwork(e.target.value === "mainnet" ? "mainnet" : "devnet")}
          >
            <option value="devnet">devnet</option>
            <option value="mainnet">mainnet (read-only)</option>
          </select>
        </label>
      </div>
      <div className="grid gap-6">
        <Explorer key={`x-${network}`} client={client} />
        <div className="grid gap-6 md:grid-cols-2">
          <AccountLookup key={`a-${network}`} client={client} />
          <RpcCard key={`r-${network}`} client={client} />
          <TokenCard key={`t-${network}`} client={client} network={network} />
          <PdaCard />
        </div>
        <PaymentCard />
      </div>
    </DocShell>
  );
}
