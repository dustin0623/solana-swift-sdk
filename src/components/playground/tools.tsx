import { useState, type ReactNode } from "react";
import { CodeBlock } from "../CodeBlock";
import {
  MockRpcProvider,
  SolanaClient,
  findProgramAddress,
  lamportsToSol,
  KeypairSigner,
  TOKEN_PROGRAM_ID,
  type ParsedTransaction,
} from "@solanaxph-sdk";
import {
  alice,
  bob,
  successfulSolTransfer,
  SOL_TRANSFER_SIGNATURE,
} from "@solanaxph-sdk/tests/fixtures";
import { createDemoTradingEnv } from "@solanaxph-sdk/tests/tradingFixtures";
import type { SwapBuildResult, SwapQuote, TradingDiscoveryCategory } from "@solanaxph-sdk";

export type LiveNetwork = "devnet" | "mainnet";

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

export function Explorer({ client }: { client: SolanaClient }) {
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

export function AccountLookup({ client }: { client: SolanaClient }) {
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

export function RpcCard({ client }: { client: SolanaClient }) {
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

export function TokenCard({ client, network }: { client: SolanaClient; network: LiveNetwork }) {
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
        <button className={btn} disabled={!mintAddress || info.busy} onClick={() => void info.run(async () => { const token = await client.tokens.get(mintAddress); const { raw: _raw, ...mintRest } = token.mint; return { asset: token.asset, mint: mintRest }; })}>
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

export function PdaCard() {
  const [seed, setSeed] = useState("vault");
  const r = useRunner();
  return (
    <Card title="Derive a PDA" code={`findProgramAddress(["vault"], TOKEN_PROGRAM_ID); // { address, bump }`}>
      <div className="flex gap-2">
        <input className={input} value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Seed" />
        <button className={btn} onClick={() => void r.run(() => findProgramAddress([seed], TOKEN_PROGRAM_ID))}>Derive</button>
      </div>
      <Status {...r} />
    </Card>
  );
}

export function PaymentCard() {
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

export function TradingCard() {
  const env = useMemo(() => createDemoTradingEnv(), []);
  const { sdk, wallet, mints } = env;
  const symbols: Record<string, string> = { SOL: "SOL", USDC: "USDC", [mints.PHX]: "PHX", [mints.BAY]: "BAY", [mints.ISL]: "ISL" };
  const [category, setCategory] = useState<TradingDiscoveryCategory>("new");
  const [query, setQuery] = useState("phx");
  const [mint, setMint] = useState<string>(mints.PHX);
  const [inputTok, setInputTok] = useState<string>("SOL");
  const [outputTok, setOutputTok] = useState<string>(mints.PHX);
  const [amount, setAmount] = useState("1000000000");
  const [slippage, setSlippage] = useState("100");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [built, setBuilt] = useState<SwapBuildResult | null>(null);
  const disc = useRunner();
  const detail = useRunner();
  const trade = useRunner();
  const exec = useRunner();
  const categories = sdk.trading.categories();

  return (
    <Card
      title="Token discovery + trading (DEMO: fixture data on a mock network)"
      code={`const page  = await sdk.trading.discover("new");        // sdk.tokens.discovery
const view  = await sdk.trading.view(mint);             // tokens.get + metadata + discovery + pools.find
const quote = await sdk.swap.quote({ input: "SOL", output: mint, amount, slippageBps });
const tx    = await sdk.swap.build({ quote, owner: wallet.address });   // unsigned
await sdk.swap.simulate(tx);
await sdk.swap.execute(tx, { signers: [wallet] });
await sdk.trading.trace(tx);   // which providers / DEX / programs`}
    >
      <p className="mt-3 rounded-md border border-border bg-muted p-3 text-xs">
        Runs the real SDK code paths against fixture tokens, fixture pools and a mock RPC. The swap program is a fake
        demo address and the wallet is a throwaway key generated in your browser. Nothing is sent to Solana and no
        prices are real. Supported discovery categories: {categories.join(", ")} ("trending" is refused because the
        demo provider cannot rank by it).
      </p>

      <h3 className="mt-4 text-sm font-semibold">1. Discovery</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <select aria-label="Category" className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value as TradingDiscoveryCategory)}>
          {(["search", "new", "trending", "recent", "volume"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {category === "search" && <input aria-label="Search" className={`${input} max-w-40`} value={query} onChange={(e) => setQuery(e.target.value)} />}
        <button className={btn} disabled={disc.busy} onClick={() => disc.run(async () => {
          const page = await sdk.trading.discover(category, { query, limit: 10 });
          return { provider: page.source, items: page.items.map((t) => ({ mint: t.mint, symbol: t.symbol, name: t.name, createdAt: t.createdAt, market: t.market })) };
        })}>Discover</button>
      </div>
      <Status {...disc} />

      <h3 className="mt-4 text-sm font-semibold">2. Token details</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <select aria-label="Token" className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={mint} onChange={(e) => setMint(e.target.value)}>
          {Object.values(mints).map((m) => <option key={m} value={m}>{symbols[m]}</option>)}
        </select>
        <button className={btn} disabled={detail.busy} onClick={() => detail.run(async () => {
          const v = await sdk.trading.view(mint);
          return { mint: v.mint, name: v.name, symbol: v.symbol, decimals: v.decimals, market: v.market, pools: v.pools, routes: v.routes, warnings: v.warnings };
        })}>Load token</button>
      </div>
      <Status {...detail} />

      <h3 className="mt-4 text-sm font-semibold">3. Trade</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        {([["Input", inputTok, setInputTok], ["Output", outputTok, setOutputTok]] as const).map(([label, val, set]) => (
          <label key={label} className="text-xs">{label}
            <select aria-label={label} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" value={val} onChange={(e) => { set(e.target.value); setQuote(null); setBuilt(null); }}>
              {Object.keys(symbols).map((k) => <option key={k} value={k}>{symbols[k]}</option>)}
            </select>
          </label>
        ))}
        <label className="text-xs">Amount (base units)<input aria-label="Amount" className={`${input} mt-1`} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="text-xs">Slippage (bps)<input aria-label="Slippage" className={`${input} mt-1`} value={slippage} onChange={(e) => setSlippage(e.target.value)} /></label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className={btn} disabled={trade.busy} onClick={() => trade.run(async () => {
          setBuilt(null);
          const q = await sdk.swap.quote({ input: inputTok, output: outputTok, amount: BigInt(amount), slippageBps: Number(slippage) });
          setQuote(q);
          return { provider: q.provider, outAmount: q.outAmount, minimumReceived: q.minOutAmount, priceImpactBps: q.priceImpactBps, fees: q.fees, route: q.route, trace: await sdk.trading.trace(q) };
        })}>Get quote</button>
      </div>
      <Status {...trade} />

      <h3 className="mt-4 text-sm font-semibold">4. Execution (mock network)</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className={btn} disabled={!quote || exec.busy} onClick={() => exec.run(async () => {
          const tx = await sdk.swap.build({ quote: quote!, owner: wallet.address });
          setBuilt(tx);
          return { unsigned: true, requiredSigners: tx.requiredSigners, estimatedFees: tx.estimatedFees, accounts: tx.accounts, warnings: tx.warnings, trace: await sdk.trading.trace(tx) };
        })}>Build</button>
        <button className={btn} disabled={!built || exec.busy} onClick={() => exec.run(() => sdk.swap.simulate(built!))}>Simulate</button>
        <button className={btn} disabled={!built || exec.busy} onClick={() => exec.run(async () => {
          const r = await sdk.swap.execute(built!, { signers: [wallet], pollIntervalMs: 1 });
          return { note: "Signed with a throwaway demo key and sent to the MOCK RPC only.", signature: r.signature, confirmationStatus: r.confirmationStatus, slot: r.slot };
        })}>Sign + execute</button>
      </div>
      <Status {...exec} />
    </Card>
  );
}

