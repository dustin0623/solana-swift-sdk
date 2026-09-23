# Examples

Standalone, copy-pasteable scripts. Each file imports only from the published package and can be
run on its own — none of them depend on the documentation frontend.

```bash
npm install hivexph-sdk
node --experimental-strip-types examples/basic-rpc.ts
```

| Example | What it shows |
| --- | --- |
| `basic-rpc.ts` | Read chain state through `hive.rpc` |
| `custom-json.ts` | Build and inspect a standardized `{ action, metadata }` payload |
| `keychain.ts` | Browser signing with Hive Keychain |
| `transaction-reader.ts` | Read one transaction by id |
| `custom-json-watch.ts` | Watch live `custom_json` events with `actions: []` filters |
| `payment-watch.ts` | Watch payments and act only on verified ones |
| `token-issuer.ts` | Backend token issue / transfer / burn |
| `nft-issuer.ts` | Backend NFT issue / transfer / burn |

Backend examples read credentials from environment variables. Never ship those variables — or any
private key — to a browser bundle; use Hive Keychain in the frontend.
