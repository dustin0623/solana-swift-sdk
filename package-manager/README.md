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
