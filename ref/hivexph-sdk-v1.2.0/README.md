# HiveXPH SDK

A TypeScript SDK for **Hive Custom JSON operations, payments and blockchain streaming**, plus a
React documentation site and interactive playground.

The SDK lives in [`package-manager/`](./package-manager) and is framework-agnostic: no React, no
DOM, no Node-only APIs. The site in `src/` is only a consumer of that package.

---

## Table of contents

- [Install & run](#install--run)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [The standardized payload](#the-standardized-payload)
- [Configuration](#configuration)
- [`hive.rpc` — blockchain communication](#hiverpc--blockchain-communication)
- [`hive.builder` / `hive.parser` — Custom JSON](#hivebuilder--hiveparser--custom-json)
- [`hive.keychain` — frontend signing](#hivekeychain--frontend-signing)
- [`hive.issuer` — tokens & NFTs](#hiveissuer--tokens--nfts)
- [`hive.payments` — native & Layer 2 payments](#hivepayments--native--layer-2-payments)
- [Streaming: one Block Stream](#streaming-one-block-stream)
  - [`hive.blocks.watch()`](#hiveblockswatch)
  - [`hive.customJson.watch()`](#hivecustomjsonwatch)
  - [`hive.payments.watch()`](#hivepaymentswatch)
  - [`hive.reader.stream()` — unified stream](#hivereaderstream--unified-stream)
- [`hive.reader.transaction` — transaction reader](#hivereadertransaction--transaction-reader)
- [Errors](#errors)
- [Type reference](#type-reference)
- [Playground](#playground)
- [Project layout](#project-layout)
- [Security rules](#security-rules)
- [Scripts](#scripts)
- [Examples](./examples) · [Changelog](./package-manager/CHANGELOG.md)

---

## Install & run

```bash
bun install
bun run dev          # documentation site + playground on :8080
bun run test         # vitest
bun run typecheck    # app types
bun run typecheck:package
bun run build:package
```

The SDK itself has **zero runtime dependencies**. Runnable snippets live in
[`examples/`](./examples); the release history is in
[`package-manager/CHANGELOG.md`](./package-manager/CHANGELOG.md).

---

## Architecture

```text
HiveClient
 ├── configs         your configuration object, stored verbatim and frozen
 ├── accounts        key-free account references
 ├── rpc             Hive RPC + node selection (Beacon, fallback)
 ├── builder         custom_json payload/operation builder
 ├── parser          custom_json parsing + protocol validation
 ├── keychain        frontend signing (Hive Keychain)
 ├── keychainIssuer  frontend token + NFT operations through Hive Keychain
 ├── issuer          backend Hive Engine token + NFT operations
 ├── payments        native HIVE/HBD + Layer 2 payments, validation, watching
 ├── blocks          THE core block stream (raw blocks)
 ├── customJson      parse() + watch() over the core block stream
 └── reader          transaction reader + unified multi-filter stream engine
```

**One streaming engine.** `hive.blocks.watch()`, `hive.customJson.watch()`,
`hive.payments.watch()` and `hive.reader.stream()` are all consumers or dispatch layers over the
same block reader. No namespace opens its own polling loop.

---

## Quick start

```ts
import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient({
  accounts: {
    treasury: { accountEnv: "TREASURY_ACCOUNT", keyEnv: "TREASURY_ACTIVE_KEY" },
    reader: { account: "my-app" },
  },
  metadata: { app: "my-app" },
});

// Read one transaction
const tx = await hive.reader.transaction({
  transactionId: "7b064a84a968caddd2496f3270f0cecafb954217",
});

// Watch payments
const controller = new AbortController();
for await (const payment of hive.payments.watch({
  filters: { account: "rhiaji", symbol: "SCRAP" },
  signal: controller.signal,
})) {
  console.log(payment.status, payment.transfer.quantity, payment.trigger?.action);
}
```

---

## The standardized payload

Every transport — `custom_json`, native transfer memos and Hive Engine transfer memos — carries the
**same** payload shape:

```json
{ "action": "purchase_item", "metadata": { "itemId": "sword_01" } }
```

Rules:

- `action` is a required non-empty string.
- `metadata` is always present after normalization, possibly `null`.
- **No timestamps.** The blockchain block time is the authoritative clock.
- Payloads that do not match the shape are *raw* — they are still readable, but never treated as
  standardized events.

```ts
import { HiveClient, isActionPayload, validateActionPayload } from "hivexph-sdk";

const hive = new HiveClient();
const payload = hive.builder.buildPayload({ action: "purchase_item", metadata: { id: 1 } });
const json = hive.builder.serialize(payload);        // ready for custom_json
isActionPayload(JSON.parse(json));                   // true
validateActionPayload(JSON.parse(json));             // { valid: true }
```

---

## Configuration

`hive.configs` is the configuration object you passed to the client — stored verbatim, frozen and
fully typed. The SDK does not manage staging, production, testing or any other environment: you
define your own structure and read it back directly. Configuration never carries RPC endpoints and
never holds resolved private keys — `keyEnv` is resolved lazily, only when a backend signing
operation needs it.

```ts
const hive = new HiveClient({
  endpoint: "https://api.hive.blog",     // optional; RPC system concern
  accounts: {                            // reserved key: alias -> Hive account
    treasury: { accountEnv: "TREASURY_ACCOUNT", keyEnv: "TREASURY_ACTIVE_KEY" },
  },
  tests: {                               // anything else is yours
    accounts: { minter: "test-minter" },
  },
});

hive.accounts.treasury;              // key-free AccountReference
hive.configs.tests.accounts.minter;  // "test-minter", fully typed
hive.listAccounts();                 // ["treasury"]
```

Need a second configuration? Create a second client — there is no runtime switching:

```ts
const testHive = new HiveClient(testConfig);
const productionHive = new HiveClient(productionConfig);
```

| Field         | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `account`     | Direct Hive account name                                     |
| `accountEnv`  | Env var holding the account name                             |
| `key`         | Direct private key — backend only, never in frontend code    |
| `keyEnv`      | Env var holding the private key (preferred, backend only)    |
| `options`     | Arbitrary developer data preserved verbatim                  |

Account references are passed to operations as objects, never strings:

```ts
await hive.payments.hive.transfer({ from: hive.accounts.treasury, /* ... */ });
```

---

## `hive.rpc` — blockchain communication

```ts
await hive.rpc.call("condenser_api.get_accounts", [["alice"]]);
await hive.rpc.getDynamicGlobalProperties();
await hive.rpc.getHeadBlockNumber();
await hive.rpc.getBlock(109542165);
hive.rpc.resetEndpoint();
```

Node selection lives in the RPC system: an explicit `endpoint`, Beacon-discovered healthy nodes
(`hive.beacon`), then the default node. Failures fall back automatically.

---

## `hive.builder` / `hive.parser` — Custom JSON

Build:

```ts
const op = hive.builder.buildOperation({
  username: "alice",
  id: "my-app",
  action: "purchase_item",
  metadata: { itemId: "sword_01" },
  authority: "posting", // or "active"
});
```

Parse (`hive.customJson.parse` delegates to `CustomJsonParser.parseOperation`):

```ts
const result = hive.customJson.parse(
  operation,
  { blockNumber, blockTimestamp, transactionId, transactionIndex, operationIndex },
  { id: "my-app" }, // optional filter: { id, actions }
);

if (result.status === "ok") {
  result.event; // { id, action, metadata, account, requiredAuths, requiredPostingAuths, ... }
} else if (result.status === "invalid") {
  result.reason; // why the payload is not protocol-compliant
}
// "not_custom_json" -> different id, filtered action, or not a custom_json operation
```

Parsing is **safe**: malformed JSON and non-conforming payloads resolve to a result status instead
of throwing, so a bad transaction can never kill a stream.


---

## `hive.keychain` — frontend signing

```ts
if (!hive.keychain.isAvailable()) throw new Error("Install Hive Keychain");

const signIn = await hive.keychain.requestSignIn({
  username: "alice",
  message: "Sign in to my-app: nonce-123456",
});
// signIn.signature can be verified server-side to prove account ownership

const result = await hive.keychain.customJson({
  username: "alice",
  id: "my-app",
  action: "purchase_item",
  metadata: { itemId: "sword_01" },
  authority: "posting",
});

await hive.keychain.customJsonRaw({ username, id, json, authority });
await hive.keychain.requestTransfer({ username, to, amount, currency: "HIVE", memo });
```

Keychain results are normalized to `{ success, transactionId?, error? }`. The SDK never touches
private keys in the browser. Sign-in returns `{ success, username, message, authority, signature,
signedAt, raw }` so an app can verify account ownership from an app-generated challenge.

### `hive.keychainIssuer` — tokens & NFTs through Keychain

```ts
// Token creation. Required: name, symbol, precision, maxSupply. Optional: url.
// The BEE balance and existing-symbol checks run before Keychain opens.
await hive.keychainIssuer.token.create({
  username: "alice",
  name: "My Token",
  symbol: "MYTOKEN",
  precision: 3,
  maxSupply: "1000000",
});

// NFT collection creation. Required: name, symbol.
// Optional: orgName, productName, maxSupply, website, authorizedIssuingAccounts,
// authorizedIssuingContracts.
await hive.keychainIssuer.nft.create({
  username: "alice",
  name: "My Collection",
  symbol: "MYNFT",
});

// Read-only preflight and offline payload preview
const check = await hive.keychainIssuer.token.checkCreate({ username: "alice", symbol: "MYTOKEN" });
const payload = hive.keychainIssuer.token.buildCreate({
  name: "My Token",
  symbol: "MYTOKEN",
  precision: 3,
  maxSupply: "1000000",
});
```

Token and NFT creation preflights run before Keychain opens and throw `INSUFFICIENT_BEE` or
`TOKEN_ALREADY_EXISTS` / `NFT_ALREADY_EXISTS` if the account cannot afford the sidechain fee or the
symbol is taken. Pass `skipChecks: true` to opt out.

---

## `hive.issuer` — tokens & NFTs

Backend Hive Engine operations, signed with a configured account alias.

### Tokens

```ts
// Create a new token. Required: name, symbol, precision, maxSupply. Optional: url.
await hive.issuer.token.create({
  from: hive.accounts.treasury,
  name: "My Token",
  symbol: "MYTOKEN",
  precision: 3,
  maxSupply: "1000000",
});

await hive.issuer.token.issue({ from: hive.accounts.treasury, symbol: "SCRAP", account: "bob", quantity: "10" });
await hive.issuer.token.transfer({ from: hive.accounts.treasury, symbol: "SCRAP", account: "bob", quantity: "1.5" });
await hive.issuer.token.burn({ from: hive.accounts.treasury, symbol: "SCRAP", quantity: "1" });

hive.issuer.token.buildCreate({ ... }); // offline preview: no keys, no network
```

### NFTs

NFTs mirror the same shape via `hive.issuer.nft` (`create`, `issue`, `issueMultiple`,
`transfer`, `burn`). `create()` requires `name` and `symbol`; everything else is optional and can
be updated later in TribalDex.

```ts
await hive.issuer.nft.create({
  from: hive.accounts.treasury,
  name: "My Collection",
  symbol: "MYNFT",
});
```

### Creation preflight

Both `hive.issuer.token.create()` and `hive.issuer.nft.create()` run a preflight first: the signing
account must hold the sidechain creation fee in BEE, and the symbol must not already exist. Either
failure throws before a private key is resolved or a transaction is signed (`INSUFFICIENT_BEE`,
`TOKEN_ALREADY_EXISTS`, `NFT_ALREADY_EXISTS`). Pass `skipChecks: true` to bypass.

**Quantities are always decimal strings.** Never floats.

NFT instance limits are enforced (`NFT_MAX_TRANSFER_INSTANCES`,
`NFT_MAX_ISSUE_MULTIPLE_INSTANCES`).

---

## `hive.payments` — native & Layer 2 payments

One payment model for both networks. A payment is a transfer whose memo carries the standardized
trigger.

### Send

```ts
// Native HIVE / HBD
await hive.payments.hive.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  amount: "10.000",
  symbol: "HIVE",
  action: "purchase_item",
  metadata: { itemId: "sword_01" },
});

// Hive Engine (Layer 2)
await hive.payments.engine.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  symbol: "SCRAP",
  quantity: "1",
  action: "purchase_item",
});
```

`build(...)` returns an offline preview of the exact operation. Trigger memos are limited to
`MAX_MEMO_BYTES` (2048).

### Parse & validate

```ts
const payments = await hive.payments.parse({ transactionId });

const result = await hive.payments.validate({
  transactionId,
  expected: { account: "bob", symbol: "SCRAP", quantity: "1", action: "purchase_item" },
});
// result.status: "pending" | "success" | "failed" | "invalid" | "not_found"
```

Broadcasting a Layer 2 transfer only proves the `custom_json` reached Hive. **Execution success is
a separate sidechain check** — always validate before crediting anything.

| Status      | Meaning                                                |
| ----------- | ------------------------------------------------------ |
| `pending`   | Not yet indexed / verifiable                            |
| `success`   | Transfer *and* (for Layer 2) execution succeeded        |
| `failed`    | Transaction exists, execution failed                    |
| `invalid`   | Exists but does not match expectations                  |
| `not_found` | Transaction cannot be found                             |

---

## Streaming: one Block Stream

All streaming APIs read from the same core block reader.

```text
                    ┌─────────────────────────┐
                    │  core Block Stream      │  ← one RPC polling loop
                    └───────────┬─────────────┘
        ┌───────────────┬───────┴────────┬────────────────────┐
 hive.blocks.watch  hive.customJson  hive.payments      hive.reader.stream
   (raw blocks)        .watch()        .watch()        (multi-filter engine)
```

Shared options (`BlockStreamOptions`):

| Option               | Default        | Meaning                                    |
| -------------------- | -------------- | ------------------------------------------ |
| `fromBlock`          | head block     | First block to read                        |
| `signal`             | —              | `AbortSignal` to stop cleanly              |
| `pollIntervalMs`     | `3000`         | Poll interval while waiting for new blocks |
| `onError`            | —              | Recoverable RPC errors instead of throwing |
| `maxRetriesPerBlock` | `5`            | Consecutive failures before throwing       |

### `hive.blocks.watch()`

Raw async block iterator — the foundation.

```ts
for await (const block of hive.blocks.watch({ fromBlock: 109542165 })) {
  console.log(block.blockNumber, block.transactions.length);
}
```

### `hive.customJson.watch()`

Filtered, normalized standardized Custom JSON events.

```ts
const controller = new AbortController();

for await (const event of hive.customJson.watch({
  id: "my-app",
  actions: ["purchase_item", "refund"], // OR-matched, optional
  signal: controller.signal,
  onInvalidPayload: (info) => console.warn(info.reason, info.blockNumber),
})) {
  console.log(event.account, event.action, event.metadata);
}
```

Malformed payloads are reported through `onInvalidPayload` and never break iteration.

### `hive.payments.watch()`

The preferred payment iterator. (`payments.stream()` no longer exists.)

```ts
for await (const payment of hive.payments.watch({
  filters: {
    account: "rhiaji",        // recipient
    symbol: "SCRAP",
    from: "alice",            // optional
    quantity: "1",            // optional exact decimal string
    actions: ["purchase_item"], // optional, OR-matched, implies a valid trigger
  },
  signal: controller.signal,
  onFailed: (p) => console.warn("execution failed", p.transactionId),
})) {
  console.log(payment.status, payment.trigger?.action ?? "no trigger");
}
```

Rules:

- Native HIVE/HBD and Layer 2 transfers are detected **automatically** — there is no `network`
  filter and events do not expose a `network` filter dimension for matching.
- `actions[]` implies a valid standardized trigger.
- Without `actions[]`, matching payments are emitted **with or without** a trigger. A payment with
  an empty or malformed memo is still emitted; it simply has `trigger === null` and is not
  processed as a standardized action.

### `hive.reader.stream()` — unified stream

One engine, many filters, one blockchain connection.

```ts
const stream = hive.reader.stream({
  startBlock: 109542165,          // alias of fromBlock
  engineConfirmationAttempts: 6,  // Layer 2 execution re-reads (default 6)
  engineConfirmationDelayMs: 2000,// delay between re-reads (default 2000)
});

const offCustomJson = stream.customJson({
  id: "my-app",
  actions: ["purchase_item"],
  standardizedOnly: true,
  handler: (event) => console.log(event.action, event.metadata),
});

stream.payment({
  account: "rhiaji",
  symbol: "SCRAP",
  actions: ["purchase_item"],
  handler: (payment) => credit(payment),        // verified successes only
  onFailed: (payment) => refund(payment),       // failed Layer 2 execution
});

stream.onEvent((event) => log(event));          // every normalized event

await stream.start();
// ...
offCustomJson.unsubscribe();                    // or offCustomJson()
stream.stop();                                  // filters survive; start() resumes
```

Supported filter kinds: `customJson()`, `payment()`, `onEvent()`. There is no NFT stream filter.

**Layer 2 confirmation.** The Hive Engine sidechain indexes a few seconds after the Hive block, so
the engine re-reads a pending execution up to `engineConfirmationAttempts` times. Pending results
are never cached, so a transfer is never silently dropped.

---

## `hive.reader.transaction` — transaction reader

```ts
const result = await hive.reader.transaction({
  transactionId: "7b064a84...",
  id: "my-app",           // optional custom_json id filter
  actions: ["purchase"],  // optional standardized action filter
});

result.operations;  // every operation in blockchain order, tagged by kind
result.customJson;  // standardized Custom JSON events
result.payments;    // native + Layer 2 payments, triggers already associated
result.nfts;        // Hive Engine NFT actions
result.invalid;     // custom_json operations that broke the protocol
```

Every operation is classified as `custom_json`, `payment`, `nft` or `unknown` — an operation the
SDK does not interpret is reported, never an error and never dropped.

The reader and the streams **share the same parsers**, so an operation read by transaction id is
identical to the same operation read from a stream. Layer 2 payments are reported as `pending`
until `hive.payments.validate()` reads the Hive Engine execution logs: inclusion in a Hive block is
not proof that the sidechain contract succeeded.

---

## Errors

All SDK errors extend `HiveSdkError` with a stable `code`:

| Error class                             | When                                     |
| --------------------------------------- | ---------------------------------------- |
| `HiveConfigurationError`                | Invalid configuration                    |
| `HiveAccountNotFoundError`              | Unknown account alias                    |
| `HiveAccountResolutionError`            | Alias could not be resolved              |
| `HiveEnvironmentVariableMissingError`   | Missing `accountEnv` / `keyEnv` value    |
| `HiveSigningKeyMissingError`            | No key available for a signing operation |
| `HiveSigningError`                      | Signing or broadcasting failed           |
| `NftValidationError` and friends        | NFT input/limit violations               |

Streaming errors are resilient by default: recoverable RPC failures go to `onError` and retry, and
only `maxRetriesPerBlock` consecutive failures on the same block throw.

---

## Type reference

Key exported types:

```ts
HiveClientOptions, HiveRuntimeOptions, HiveConfig, HiveConfigs, HiveAccountConfig, ResolvedAccount
ActionPayload, ActionPayloadInput
CustomJsonPayload, CustomJsonInput, CustomJsonEvent, HiveAuthority
BlockStreamOptions, CustomJsonStreamOptions, NumberedBlock, HiveBlock, HiveTransaction
UnifiedStreamOptions, StreamEvent, StreamEventPosition, StreamEventType, StreamSubscription
CustomJsonFilter, CustomJsonStreamEvent, PaymentFilter, PaymentStreamEvent, PaymentSource
ParsedPayment, PaymentTransfer, PaymentTrigger, PaymentStatus, PaymentNetwork
PaymentStreamOptions, PaymentStreamFilters, PaymentExpectation, PaymentValidationResult
KeychainResult, KeychainSignInInput, KeychainSignInResult, KeychainCustomJsonInput, KeychainTransferInput
KeychainTokenCreateInput, KeychainNftCreateInput
TokenCreateInput, TokenCreateActionInput, TokenCreationCheck, TokenCreationCheckInput, EngineTokenRow
TokenIssueInput, TokenTransferInput, TokenBurnInput
NftCreateInput, NftCreateActionInput, NftCreationCheck, NftCreationCheckInput, EngineNftRow
NftIssueInput, NftTransferInput
```

Everything is strictly typed: no `any`, quantities are decimal strings, and generics carry your
metadata shape (`hive.customJson.watch<MyMeta>({ ... })`).

---

## Playground

The site ships a live testing playground:

| Page                          | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `/playground/unified-stream`  | Multi-filter live stream (Custom JSON + payments)     |
| `/playground/custom-json`     | Sign Custom JSON with Hive Keychain                   |
| `/playground/reader`          | Read and parse a transaction by id                    |
| `/playground/payments`        | Build, send and validate payments                     |
| `/playground/payment-monitor` | Watch incoming payments live                          |
| `/playground/token`, `/nft`   | Hive Engine token and NFT operations                  |
| `/playground/configurations`, `/nodes`, `/rpc`, `/raw-custom-json` | Configs, node health, raw calls |

Payment filters require a **recipient** and a **symbol**. Payments with missing or malformed
triggers are still displayed and labelled `no trigger · not processed`.

Full documentation is browsable at `/docs`.

---

## Project layout

```text
package-manager/          the SDK (no React, no DOM)
  core/         HiveClient
  configs/      configuration registry, contexts, account references
  environment/  env resolution
  rpc/ beacon/  node communication + health discovery
  transaction/  custom_json builder, assembler, serializer + internal signing
  protocol/     standardized { action, metadata } payload
  parser/       safe parsing + validation
  keychain/     frontend signing
  engine/ issuer/ Hive Engine contracts, tokens, NFTs
  payments/     native + Layer 2 payments, validation, PaymentWatcher
  stream/       BlockStreamer, BlockWatcher, CustomJsonWatcher
  reader/       TransactionReader, ReaderClient, unified StreamEngine
  errors/ types/ utils/
src/                      TanStack Start docs site + playground
```

---

## Security rules

- Private keys **never** live in frontend code or in configuration objects checked into git — use
  `keyEnv`.
- Keys are resolved lazily at signing time and never cached.
- Account references passed around the API are key-free.
- Layer 2 payments are only trusted after execution validation.
- Config summaries and logs never contain secrets.

---

## Scripts

| Script                        | What it does                       |
| ----------------------------- | ---------------------------------- |
| `bun run dev`                 | Dev server (docs + playground)     |
| `bun run build`               | Production build of the site       |
| `bun run test`                | Vitest suite                       |
| `bun run typecheck`           | App typecheck                      |
| `bun run typecheck:package`   | SDK typecheck                      |
| `bun run build:package`       | Emit the SDK `dist/`               |
| `bun run lint` / `format`     | ESLint / Prettier                  |

MIT licensed.
