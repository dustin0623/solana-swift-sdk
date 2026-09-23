# Introducing hivexph-sdk v1.2.0 — A TypeScript SDK Built for Hive Developers

*Posted for PeakD — feel free to copy this markdown directly into the editor.*

---

Hello Hive! 👋

Welcome to my newly created AI slop SDK — **hivexph-sdk**, a reusable TypeScript SDK for the Hive blockchain.

> 📝 *This post was generated with the help of AI to summarize the full feature set of the SDK from the README, API reference, and changelog.*

I built this slop to stop rewriting the same Hive plumbing in every project: connecting to RPC nodes, watching blocks, parsing `custom_json`, sending and validating payments, issuing tokens, and creating NFT collections. It was a lot of repetitive wiring before I could ever get to the actual product, so I packaged it all into one typed SDK with a single, predictable API.

**hivexph-sdk is that plumbing, packaged up and typed.**

Version **1.2.0** is out now, and it adds the three pieces I kept needing in real projects: **Keychain sign-in**, **token creation**, and **NFT collection creation** — each with preflight checks that catch missing balances, duplicate symbols, or bad inputs before anything is broadcast.

If you want to test it, the docs site is live at **https://hivexph-sdk-frontend.vercel.app/** — feel free to play around, find bugs, suggest improvements, or help beautify this AI slop into something even better.

```bash
npm install hivexph-sdk
```

- 📦 Package: `hivexph-sdk` (ESM only, fully typed)
- 🏠 Docs / playground: https://hivexph-sdk-frontend.vercel.app/
- 💻 Source: https://github.com/rhiaji/hivex-sdk
- 📜 License: MIT

---

## Why I built this

I built this SDK **for myself first**.

I kept starting new Hive projects and rewriting the same code:

- Connect to an RPC node and fall back when it’s slow.
- Watch blocks without skipping them or opening five polling loops.
- Parse `custom_json` payloads safely and ignore malformed ones.
- Send HIVE/HBD payments and confirm them.
- Issue Hive Engine tokens from a backend.
- Let users sign things in the browser with Hive Keychain.

Every project reinvented the wheel slightly differently. After the third or fourth time, I realized it made more sense to pull it all into one SDK with a single, predictable API — and then open source it so other builders on Hive don’t have to start from scratch.

This SDK was made to power my own apps first, especially the upcoming rebuild of **hivexph**, but I hope it ends up useful for anyone building on Hive. The goal is simple: **one package, one import, one mental model for reading from and writing to Hive.**

---

## What is hivexph-sdk?

It is a single-entry-point TypeScript SDK for Hive.

It runs almost everywhere: **Node 18+, Bun, Deno, browsers, and edge/Worker runtimes**. It has **no React dependency**, no DOM access at module scope, and **zero side effects on import** — importing it does not open a connection or start a stream.

Everything lives behind one class:

```ts
import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient({
  endpoint: "https://api.hive.blog", // optional; Beacon discovery otherwise
  accounts: {
    treasury: { accountEnv: "TREASURY_ACCOUNT", keyEnv: "TREASURY_ACTIVE_KEY" },
  },
});
```

From that one object you get:

```
hive
 ├── configs         // named configurations, account aliases, env references
 ├── accounts        // key-free account references
 ├── rpc             // blockchain communication
 ├── beacon          // healthy node discovery
 ├── builder         // custom_json payload construction
 ├── parser          // safe custom_json parsing
 ├── blocks.watch()  // the single canonical block stream
 ├── reader          // transaction reading + unified stream engine
 ├── customJson      // build / broadcast / watch standardized payloads
 ├── payments        // native HIVE/HBD + Layer 2 payments
 ├── issuer          // backend token + NFT operations
 ├── keychain        // browser sign-in and signing via Hive Keychain
 └── keychainIssuer  // browser token + NFT operations via Hive Keychain
```

No deep imports. No secondary entry points. If you can do it with the SDK, you can reach it from `hivexph-sdk`.

---

## Who is this for?

- **Game developers** who want players to buy items with HIVE, HBD, or Hive Engine tokens.
- **Marketplace builders** who need to verify payments before shipping digital goods.
- **Bot and service operators** who watch `custom_json` for app-specific actions.
- **Token creators** who want to launch a Hive Engine token from a script or a UI.
- **NFT project founders** who want to create collections without doing everything manually in TribalDex.
- **Anyone** who just wants typed, tested helpers instead of raw RPC and string memos.

If you write TypeScript or JavaScript, this is for you.

---

## The one streaming engine

A lot of SDKs open a new polling loop for every feature. That gets expensive and messy.

`hive.blocks.watch()`, `hive.customJson.watch()`, `hive.payments.watch()`, and `hive.reader.stream()` are all **filtered views over the same block reader**. The engine handles head tracking, sequential ordering, historical backfill, the transition from history to live blocks, retries, and `AbortSignal` cancellation.

```ts
for await (const block of hive.blocks.watch({ fromBlock: 90_000_000 })) {
  for (const tx of block.transactions) {
    for (const op of tx.operations) {
      console.log(block.blockNumber, tx.transactionId, op.operationType);
    }
  }
}
```

Blocks are normalized once, so every consumer sees the same shape regardless of how a node represents operations.

For app-specific events, `customJson.watch()` gives you clean, validated events:

```ts
for await (const event of hive.customJson.watch({ id: "my-app" })) {
  console.log(event.account, event.action, event.metadata);
}
```

No manual parsing. No noise. Just your app’s events.

---

## One payload shape everywhere

Every transport — `custom_json`, native transfer memos, Hive Engine memos — uses the same normalized payload:

```json
{ "action": "purchase_item", "metadata": { "itemId": "sword_01" } }
```

- `action` is a required non-empty string.
- `metadata` is always present after normalization (it may be `null`).
- **Block time is the clock.** There are no payload timestamps, so you never have to trust a client clock.

That means your frontend, backend, bot, and indexer can all speak the same language.

---

## Payments that are easy to verify

Send and validate native HIVE/HBD or Layer 2 payments with the same API:

```ts
await hive.payments.hive.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  amount: "10.000",
  symbol: "HIVE",
  action: "purchase_item",
  metadata: { itemId: "sword_01" },
});

const result = await hive.payments.validate({
  transactionId, // the network is detected automatically
  expected: {
    account: "bob",
    symbol: "HIVE",
    quantity: "10.000",
    action: "purchase_item",
  },
});
// result.status: "pending" | "success" | "failed" | "invalid" | "not_found"
```

This matters for any app that delivers something after payment. You get a clear status, and for Layer 2 transfers the SDK reminds you that reaching Hive is not the same as sidechain execution — always validate before crediting.

---

## Backend vs. browser: one SDK, two safe paths

### Backend

Backend issuers resolve an account alias, lazily load the signing key from an environment variable, sign, and broadcast. Quantities are always decimal strings, never floats.

```ts
await hive.issuer.token.issue({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "alice",
  quantity: "10.000",
});
```

You can also preview a payload offline without touching a key:

```ts
const preview = hive.issuer.token.buildIssue({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  account: "alice",
  quantity: "10.000",
});

preview.alias;     // "treasury"
preview.id;        // resolved application id
preview.json;      // serialized contract action
preview.operation; // ["custom_json", { ... }]
```

### Browser

In the browser, use Hive Keychain. No private keys in source code. No configuration with secrets.

```ts
if (!hive.keychain.isAvailable()) {
  throw new Error("Please install Hive Keychain");
}

const signIn = await hive.keychain.requestSignIn({
  username: "alice",
  message: "Sign in to my-app: nonce-123456",
});
// Verify signIn.signature server-side to prove account ownership.
```

And for token transfers:

```ts
await hive.keychainIssuer.token.transfer({
  username: "alice",
  symbol: "MYTOKEN",
  account: "bob",
  quantity: "1.000",
});
```

### Security rules baked in

- Private keys never live in frontend code or committed configuration — use `keyEnv`.
- Keys are resolved lazily at signing time and never cached.
- Account references passed around the API are key-free.
- Config summaries and logs never contain secrets.

---

# 🆕 What’s new in v1.2.0

This release focuses on **creation flows**: signing in with Keychain, creating Hive Engine tokens, and creating NFT collections — from both backend scripts and browser UIs — with BEE balance and symbol availability checks before you broadcast.

## Keychain sign-in

- `hive.keychain.requestSignIn()` for Hive Keychain account sign-in.
- Typed `KeychainSignInInput` and `KeychainSignInResult` exports.
- A Keychain playground sign-in tab for signing an app challenge message.

## Token creation (`tokens.create`)

- `hive.keychainIssuer.token.create()` and `hive.issuer.token.create()` handle the Hive Engine `tokens.create` action.
- **Mandatory creation preflight:** the signing account must hold at least the sidechain token creation fee in BEE, and the token symbol must not already exist. Either failure throws (`INSUFFICIENT_BEE`, `TOKEN_ALREADY_EXISTS`) *before* Keychain opens or a key is resolved.
- `checkCreate()` on both issuers, plus the exported `TokenCreationChecker`, for read-only fee, BEE balance, and symbol availability lookups.
- `buildCreate()` for offline payload previews.
- New exports: `TokenCreateInput`, `TokenCreateActionInput`, `TokenCreationCheck`, `TokenCreationCheckInput`, `EngineTokenRow`, `KeychainTokenCreateInput`, the `BEE_SYMBOL` and token limit constants, and the `INSUFFICIENT_BEE` / `TOKEN_ALREADY_EXISTS` error codes.
- A token creation panel in the playground covering both the Keychain and server paths.
- Server-side token creation tests for payload parity, validation, preflight enforcement, and the `skipChecks` opt-out.

```ts
// Browser (Keychain)
await hive.keychainIssuer.token.create({
  username: "alice",
  symbol: "MYTOKEN",
  name: "My Token",
  precision: 3,
  maxSupply: "1000000",
});

// Backend (alias + env key)
await hive.issuer.token.create({
  from: hive.accounts.treasury,
  symbol: "MYTOKEN",
  name: "My Token",
  precision: 3,
  maxSupply: "1000000",
});
```

## NFT collection creation (`nft.create`)

- `hive.keychainIssuer.nft.create()` and `hive.issuer.nft.create()` handle the Hive Engine `nft.create` action.
- Required: `name` and `symbol`. Optional: `orgName`, `productName`, `maxSupply`, `website`, `authorizedIssuingAccounts`, `authorizedIssuingContracts`.
- **NFT creation preflight:** the signing account must hold the NFT creation fee in BEE (100 BEE by default, read from `nft.params`) and the NFT symbol must not already exist. Either failure throws (`INSUFFICIENT_BEE`, `NFT_ALREADY_EXISTS`) before Keychain opens or a key is resolved.
- `checkCreate()` and `buildCreate()` on both NFT issuers, plus the exported `NftCreationChecker`.
- New exports: `NftCreateInput`, `NftCreateActionInput`, `NftCreationCheck`, `NftCreationCheckInput`, `EngineNftRow`, `KeychainNftCreateInput`, the NFT creation fee and field limit constants, and the `NFT_ALREADY_EXISTS` error code.
- An NFT creation panel in the playground.
- NFT creation tests for payload shape, field validation, preflight failures, and the `skipChecks` opt-out.

```ts
await hive.keychainIssuer.nft.create({
  username: "alice",
  name: "My Collection",
  symbol: "MYNFT",
  orgName: "My Org",              // optional
  productName: "My Product",      // optional
  maxSupply: "1000",              // optional, unlimited when omitted
  website: "https://example.com", // optional
});

// Read-only preflight, or an offline payload preview:
const check = await hive.keychainIssuer.nft.checkCreate({ username: "alice", symbol: "MYNFT" });
const payload = hive.keychainIssuer.nft.buildCreate({ name: "My Collection", symbol: "MYNFT" });
```

For both tokens and NFTs, pass `skipChecks: true` to broadcast without the preflight when you know what you’re doing.

## Documentation

The sign-in, token creation, and NFT creation flows are documented in the README, API reference, and release notes at the docs site.

---

# Full changelog

## 1.2.0

### Added

- `hive.keychain.requestSignIn()` for Hive Keychain account sign-in, with typed `KeychainSignInInput` / `KeychainSignInResult` exports and a playground sign-in tab.
- Token creation: `hive.keychainIssuer.token.create()` and `hive.issuer.token.create()` with a mandatory BEE fee + symbol preflight (`INSUFFICIENT_BEE`, `TOKEN_ALREADY_EXISTS`), `checkCreate()`, `buildCreate()`, `TokenCreationChecker`, related types/constants, a playground panel, and full tests.
- NFT creation: `hive.keychainIssuer.nft.create()` and `hive.issuer.nft.create()` with the same preflight pattern (`INSUFFICIENT_BEE`, `NFT_ALREADY_EXISTS`), `checkCreate()`, `buildCreate()`, `NftCreationChecker`, related types/constants, a playground panel, and full tests.

### Changed

- Documented the sign-in, token creation, and NFT creation flows in the README, API reference, and release notes.

## 1.0.0

First stable release. The public API is frozen under semver.

- **One canonical block engine** — `blocks.watch()`, `customJson.watch()`, `payments.watch()`, and `reader.stream()` are filtered views over a single polling loop.
- **One transaction reader** — payment parsing, Custom JSON parsing, and Layer 2 verification share one normalized operation model.
- **One write path per environment** — backend issuance through `hive.issuer`, browser issuance through `hive.keychainIssuer`, both emitting byte-identical contract actions from shared builders and validators.
- Pre-1.0 cleanup: removed the `Signer` system, executors, dry-run mode, legacy streams/builders, and all compatibility shims; `mint` naming is now `issue`.
- ESM build with generated type declarations; zero runtime Node built-ins and no DOM access at module scope.

---

## What’s next: v1.3.0 and the hivexph platform

v1.2.0 is the foundation. **v1.3.0** will add the pieces needed for real marketplaces:

- **Token market trade** operations
- **NFT marketplace** functions

These are being built so I can upgrade my existing **hivexph** platform — which already has token trading, an NFT marketplace, and other Hive tools — using a single, well-tested SDK instead of scattering the same logic across multiple projects. The SDK is meant to power hivexph and any future Hive apps I build, so every feature is generic, reusable, and safe to drop into a browser or backend.

If you’re building something similar, following along will let you reuse the same primitives in your own app.

---

## Try it out

```bash
npm install hivexph-sdk
```

The docs site with the full API reference and live playground is at **https://hivexph-sdk-frontend.vercel.app/**, and the source is on GitHub at **https://github.com/rhiaji/hivex-sdk**.

This SDK started as tooling for my own Hive projects, and I’m sharing it in case it saves you some time too. If you try it, let me know what works, what breaks, and what’s missing — feedback, issues, and ideas are very welcome. Drop a comment below or open an issue on GitHub. Thanks for reading, and see you on-chain! 🐝

---

*#hive #development #typescript #sdk #hiveengine #nft #programming #opensource #blockchain #customjson*
