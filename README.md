# SolanaXPH SDK

A strict, provider-agnostic TypeScript SDK for Solana.

SolanaXPH is built around Solana primitives — accounts, programs, instructions, transactions, versioned transactions, address lookup tables, PDAs, slots, blocks, logs, inner instructions, CPI, lamports, SOL, SPL tokens, NFTs, wallet signing, simulation, confirmation and WebSocket subscriptions. It uses **standard Solana RPC first**; Helius, QuickNode, Alchemy and private nodes plug in as interchangeable providers, never as the architecture's foundation.

## What this repo contains

- `package-manager/` — the `solanaxph-sdk` npm package (ESM + CJS + TypeScript declarations).
- `src/` — a documentation site and read-only / devnet playground built with TanStack Start.
- `ref/` — the HivexPH reference repo as ordinary committed files (read-only, not a submodule).

## Installation

```sh
npm install solanaxph-sdk
```

## Quick start

```ts
import { SolanaClient } from "solanaxph-sdk";

const solana = new SolanaClient({ network: "devnet" });

const balance = await solana.reader.balance("11111111111111111111111111111111");
console.log(balance.sol);
```

No API key is required for devnet because the SDK targets public Solana RPC by default. To use a custom provider:

```ts
const solana = new SolanaClient({
  rpc: { url: "https://your-rpc.example", wsUrl: "wss://your-rpc.example" },
});
```

## Architecture

- `SolanaClient` — central entry point that wires every module together.
- `solana.rpc` — typed `RpcClient` with raw `request<T>()` escape hatch.
- `solana.reader` — short methods (`balance`, `account`, `transaction`, `transactionsOf`, `signatures`, `block`, `slot`) plus specialised readers; every result carries a `raw` field.
- `solana.parser` — normalises legacy and versioned transactions, resolves lookup tables, extracts SOL/SPL transfers and logs.
- `solana.builder` — distinct stages: instruction → message → signed transaction → signature → confirmation. Simulation precedes broadcast.
- `solana.payments` — SOL and SPL transfers with on-chain validation; a signature alone is never treated as proof of payment.
- `solana.tokens` / `solana.nft` / `solana.programs` — SPL/Token-2022 mints, minimal NFT reads, generic program invocation.
- `solana.wallet` — signer abstraction: `KeypairSigner` for server code, `WalletAdapter` for browser wallets.
- `solana.stream` — WebSocket subscription engine with auto-reconnect and re-subscription.
- `providers/helius` — optional Helius RPC extension with DAS API methods.

## Security principles

- Private keys and seeds are never logged, serialised, or exposed to the frontend.
- Financial amounts are handled as `bigint` or decimal `string` base units; no floating-point math.
- Broadcast is explicit — the SDK never auto-signs or auto-sends.
- Commitment is always explicit (`processed`, `confirmed`, `finalized`); nothing is silently chosen.
- Read retries are safe; `sendTransaction` is never blindly retried.

## Development

```sh
# Install dependencies
bun install

# SDK
bun run --cwd package-manager test
bun run --cwd package-manager build

# Docs / playground
bun run dev        # http://localhost:8080
bun run build:dev
```

## Testing

The SDK test suite uses a deterministic `MockRpcProvider` and fixtures covering successful/failed SOL transfers, SPL transfers, multiple transfers, inner instructions, versioned transactions, lookup tables, program invocations, logs, mints and burns.

```sh
bun run --cwd package-manager test
```

## Environment variables

Copy `.env.example` to `.env` and set values only for optional providers or local test accounts. Never commit private keys.

```sh
cp .env.example .env
```

## License

MIT
