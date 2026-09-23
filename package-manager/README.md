# solanaxph-sdk

Solana-native, RPC-first, provider-agnostic TypeScript SDK.

```bash
npm install solanaxph-sdk
```

```ts
import { SolanaClient } from "solanaxph-sdk";

const solana = new SolanaClient({ network: "devnet" }); // public RPC, no API key
const balance = await solana.reader.balance(address);
const tx = await solana.reader.transaction(signature, { commitment: "finalized" });
```

- Modules: `rpc`, `reader`, `parser`, `builder`, `payments`, `tokens`, `nft`, `programs`, `wallet`, `blocks`, `stream`.
- Any RPC URL works: `new SolanaClient({ rpc: { url } })`.
- Helius extras are optional and isolated: `import { HeliusRpcProvider } from "solanaxph-sdk/helius"`.
- Nothing signs or broadcasts without an explicit call; `sendTransaction` is never retried automatically.
- Amounts are bigint / decimal strings — never floats.

Scripts: `bun run build`, `bun run test`, `bun run typecheck`.

## Token discovery

Token data ("tell me about this mint") and token discovery ("which tokens
should I show?") are separate concerns. Discovery sits behind a provider
interface, so it can be backed by RPC, an indexer, a market-data API, an
external token database, or your own implementation.

```ts
// Ships by default: on-chain provider. Resolves any mint, no indexer needed.
const token = await sdk.tokens.discovery.get(mint);
const page = await sdk.tokens.search("bonk");

// Register an indexed/market-data provider for listing and text search.
sdk.tokens.discovery.register(myProvider, { default: true });
await sdk.tokens.list({ sort: "volume", limit: 50, cursor: page.nextCursor });
```

Providers declare what they can actually do (`provider.capabilities`,
`provider.sorts`); unsupported sorts and searches throw
`UnsupportedOperationError` instead of returning invented data. Every result
carries `source.origin`: `"on-chain"` for verifiable chain state, `"indexed"`
for third-party price, volume, liquidity, market cap and verification data.

## Pool and liquidity discovery

Token discovery ≠ pool discovery. A token can exist with no usable pool at
all, so "where can this trade?" is its own layer with its own providers.

```ts
await sdk.pools.find({ token: mint });                   // any pair
await sdk.pools.find({ token: mint, pairedWith: SOL });  // token ↔ SOL
await sdk.pools.get(poolAddress);                        // normalized details
await sdk.pools.best(mint);                              // find + rank
```

`PoolProvider` (name, dex, capabilities, `findPools`, `getPool`) keeps the SDK
protocol-agnostic — Raydium, Orca, Meteora, other AMMs, an indexer or custom
venues all normalize into the same `LiquidityPool`. No DEX provider ships by
default; `StaticPoolProvider` covers curated lists, cached snapshots and tests.

Liquidity is never collapsed into one number: raw reserves, `indexedUsd`,
`tvlUsd` and `estimatedUsd` are separate, each tagged `on-chain`, `indexed` or
`derived`. Unknown fields stay `null`. `sdk.pools.rank()` scores pools by
liquidity, volume, fee, an price-impact heuristic and provider preference —
venue-selection groundwork only, not routing, quoting or execution.
