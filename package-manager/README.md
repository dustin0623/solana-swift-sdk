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
