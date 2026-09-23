import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DocShell } from "../components/DocShell";
import {
  MockRpcProvider,
  SolanaClient,
  PaymentValidator,
  ReaderClient,
  MintClient,
  findProgramAddress,
  lamportsToSol,
} from "@solanaxph-sdk";
import {
  alice,
  bob,
  mint,
  successfulSolTransfer,
  splTransfer,
  SOL_TRANSFER_SIGNATURE,
  SPL_TRANSFER_SIGNATURE,
} from "@solanaxph-sdk/tests/fixtures";

export const Route = createFileRoute("/playground")({
  component: Playground,
  head: () => ({
    meta: [
      { title: "SolanaXPH SDK Playground" },
      { name: "description", content: "Interactive, read-only Solana SDK playground using mock fixtures and devnet-safe examples." },
      { property: "og:title", content: "SolanaXPH SDK Playground" },
      { property: "og:description", content: "Interactive, read-only Solana SDK playground using mock fixtures and devnet-safe examples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Output({ value }: { value: unknown }) {
  const text =
    typeof value === "string"
      ? value
      : JSON.stringify(
          value,
          (_key, val) => (typeof val === "bigint" ? `${val.toString()}n` : val),
          2,
        );
  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">
      {text}
    </pre>
  );
}

function Playground() {
  const client = useMemo(
    () =>
      new SolanaClient({
        network: "devnet",
        rpc: { url: "https://mock-rpc.example" },
        provider: new MockRpcProvider({
          getBalance: { context: { slot: 1 }, value: 1_500_000_000 },
          getAccountInfo: {
            context: { slot: 1 },
            value: {
              lamports: 2_000_000,
              owner: "11111111111111111111111111111111",
              executable: false,
              rentEpoch: 0,
            },
          },
          getTransaction: successfulSolTransfer,
          getSignatureStatuses: {
            context: { slot: 1 },
            value: [{ slot: 123456789, confirmations: null, confirmationStatus: "finalized", err: null }],
          },
        }),
      }),
    [],
  );

  const [balance, setBalance] = useState<string | null>(null);
  const [tx, setTx] = useState<Record<string, unknown> | null>(null);
  const [pda, setPda] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<Record<string, unknown> | null>(null);

  return (
    <DocShell>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Read a balance">
          <p className="text-sm text-muted-foreground">
            Mock RPC returns 1.5 SOL. Amounts are returned as bigint-friendly
            values and converted to decimal strings only for display.
          </p>
          <button
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              const b = await client.reader.balance(alice);
              setBalance(`${b.lamports} lamports = ${b.sol} SOL`);
            }}
          >
            Get {alice.slice(0, 8)}… balance
          </button>
          {balance && <Output value={balance} />}
        </Card>

        <Card title="Parse a transaction">
          <p className="text-sm text-muted-foreground">
            Parse the mock SOL transfer fixture. The parser normalises legacy
            and versioned transactions and exposes a raw escape hatch.
          </p>
          <button
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              const parsed = await client.reader.transaction(SOL_TRANSFER_SIGNATURE, {
                commitment: "finalized",
              });
              setTx(parsed);
            }}
          >
            Parse {SOL_TRANSFER_SIGNATURE.slice(0, 16)}…
          </button>
          {tx && <Output value={tx} />}
        </Card>

        <Card title="Derive a PDA">
          <p className="text-sm text-muted-foreground">
            Deterministic program derived addresses with automatic on-curve
            rejection.
          </p>
          <button
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              const { address, bump } = findProgramAddress(["seed"], mint);
              setPda(`address: ${address}\nbump: ${bump}`);
            }}
          >
            Derive PDA
          </button>
          {pda && <Output value={pda} />}
        </Card>

        <Card title="Validate a payment">
          <p className="text-sm text-muted-foreground">
            A signature alone is not proof. The validator re-checks success,
            recipient, sender and amount on chain.
          </p>
          <button
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              const provider = new MockRpcProvider({
                getTransaction: successfulSolTransfer,
                getSignatureStatuses: {
                  context: { slot: 1 },
                  value: [
                    { slot: 123456789, confirmations: null, confirmationStatus: "finalized", err: null },
                  ],
                },
              });
              const rpc = client.rpc;
              // Re-use the client RPC for demo purposes; in real code you would
              // create one SolanaClient per provider.
              const reader = new ReaderClient(rpc);
              const validator = new PaymentValidator(reader.transactions, new MintClient(rpc));
              const result = await validator.validate({
                signature: SOL_TRANSFER_SIGNATURE,
                expected: { from: alice, to: bob, amount: "0.000005" },
              });
              setPaymentResult(result);
            }}
          >
            Validate SOL payment
          </button>
          {paymentResult && <Output value={paymentResult} />}
        </Card>
      </div>
    </DocShell>
  );
}
