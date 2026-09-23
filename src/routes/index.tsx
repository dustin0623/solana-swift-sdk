import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { DocShell } from "../components/DocShell";
import { DOCS } from "../lib/docs";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SolanaXPH SDK — Provider-agnostic TypeScript SDK for Solana" },
      { name: "description", content: "Read the docs and try the playground for SolanaXPH: a strict, RPC-first TypeScript SDK for Solana." },
      { property: "og:title", content: "SolanaXPH SDK — Provider-agnostic TypeScript SDK for Solana" },
      { property: "og:description", content: "Read the docs and try the playground for SolanaXPH: a strict, RPC-first TypeScript SDK for Solana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <DocShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            SolanaXPH SDK
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A strict, provider-agnostic TypeScript SDK for Solana. RPC-first,
            wallet-safe, and built without floating-point financial math.
          </p>
        </div>

        <section className="prose prose-zinc dark:prose-invert max-w-none">
          <h2>What is it?</h2>
          <p>
            SolanaXPH is a TypeScript SDK shaped around Solana primitives: accounts,
            instructions, transactions, versioned transactions, address lookup
            tables, PDAs, SPL tokens, NFTs and WebSocket streams. It works with any
            Solana RPC endpoint — public RPC, Helius, QuickNode, Alchemy or your own
            node — without treating a third-party provider as the foundation.
          </p>

          <h2>Installation</h2>
          <pre className="rounded-lg bg-muted p-4 text-sm font-mono">
            npm install solanaxph-sdk
          </pre>

          <h2>Quick start</h2>
          <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-x-auto">
{`import { SolanaClient } from "solanaxph-sdk";

const solana = new SolanaClient({ network: "devnet" });

// Read
const balance = await solana.reader.balance("11111111111111111111111111111111");
console.log(balance.sol);

// Send a payment
const tx = await solana.payments.sol
  .transfer({ from: sender.address, to: recipient, amount: "0.1" })
  .signWith(sender)
  .sendAndConfirm({ signers: [sender] });`}
          </pre>

          <h2>Architecture</h2>
          <ul>
            <li>
              <strong>SolanaClient</strong> — the entry point that wires every
              module together.
            </li>
            <li>
              <strong>RPC layer</strong> — typed <code>RpcProvider</code> with
              HTTP, WebSocket and Mock implementations.
            </li>
            <li>
              <strong>Reader</strong> — short methods (balance, account, transaction)
              plus specialised readers; every result exposes a <code>raw</code>{" "}
              escape hatch.
            </li>
            <li>
              <strong>Builder</strong> — distinct stages: instruction → message →
              signed transaction → signature → confirmation. Simulate explicitly
              before you broadcast.
            </li>
            <li>
              <strong>Payments</strong> — on-chain validation of SOL and SPL
              transfers. A signature alone is never treated as proof.
            </li>
            <li>
              <strong>Tokens / NFTs / Programs</strong> — SPL and Token-2022 mints
              are clearly separated; generic program callers expose no app-specific
              logic.
            </li>
          </ul>

          <h2>Security</h2>
          <ul>
            <li>Private keys and seeds are never logged or serialised.</li>
            <li>Browser code never sees keypair signers.</li>
            <li>Amounts use strings or bigint base units; no float finance.</li>
            <li>Broadcast is explicit — the SDK never auto-sends.</li>
          </ul>
        </section>

        <h2 className="mt-12 mb-4 text-2xl font-semibold">Browse the docs</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCS.map((d) => (
            <Link
              key={d.slug}
              to="/docs/$slug"
              params={{ slug: d.slug }}
              className="rounded-lg border border-border p-4 hover:bg-muted"
            >
              <div className="font-medium">{d.title}</div>
              <div className="text-sm text-muted-foreground">{d.summary}</div>
            </Link>
          ))}
        </div>
      </div>
    </DocShell>
  );
}
