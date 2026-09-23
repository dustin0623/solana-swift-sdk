import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/api-reference")({
  head: () => ({
    meta: [
      { title: "API reference — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Complete HiveXPH SDK method map with every namespace, option and branch: configs, rpc, beacon, keychain, blocks, customJson, payments, reader and issuer.",
      },
      { property: "og:title", content: "API reference — HiveXPH SDK" },
      {
        property: "og:description",
        content:
          "Every namespace, method signature, filter option and runnable example on the HiveClient.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiReferencePage,
});

const toc = [
  { id: "client", label: "HiveClient" },
  { id: "namespaces", label: "Namespaces" },
  { id: "methods", label: "Full method map" },
  { id: "configs", label: "hive.configs" },
  { id: "rpc", label: "hive.rpc / hive.beacon" },
  { id: "keychain", label: "hive.keychain" },
  { id: "sign-in", label: "Keychain sign-in" },
  { id: "creation", label: "Token & NFT creation" },
  { id: "blocks", label: "hive.blocks" },
  { id: "custom-json", label: "hive.customJson" },
  { id: "payments", label: "hive.payments" },
  { id: "reader", label: "hive.reader" },
  { id: "issuer", label: "hive.issuer" },
  { id: "branches", label: "Every result branch" },
];

function ApiReferencePage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="API reference"
      description="One client, one namespace per concern, one block stream. Every module is reachable from a HiveClient instance and every configuration context exposes the same surface."
      path="/docs/api-reference"
      toc={toc}
    >
      <DocSection id="client" title="HiveClient">
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient({
  endpoint: "https://api.hive.blog",   // optional, Beacon picks a node otherwise
  beaconUrl: "https://beacon.peakd.com/api/nodes",
  applicationId: "my-application",  // default custom_json id
  accounts: {
    treasury: { account: "my-account", keyEnv: "TREASURY_ACTIVE_KEY" },
  },
  tests: {
    accounts: { minter: "test-minter" },  // your own structure
  },
});

hive.endpoint;                     // resolved RPC endpoint
hive.accounts.treasury;            // key-free account reference
hive.configs.tests.accounts.minter; // your configuration, typed`}
        />
      </DocSection>

      <DocSection id="namespaces" title="Namespaces">
        <ParamTable
          caption="hive.*"
          rows={[
            { name: "configs", type: "HiveConfigs<TConfig>", description: "The configuration object you passed, frozen and fully typed." },
            { name: "accounts", type: "Record<string, AccountReference>", description: "Key-free account references built from configs.accounts." },
            { name: "rpc", type: "RpcClient", description: "Raw JSON-RPC access, block reads and broadcasting." },
            { name: "beacon", type: "BeaconClient", description: "Node discovery and health scoring." },
            { name: "builder", type: "CustomJsonBuilder", description: "Build standardized custom_json operations." },
            { name: "parser", type: "CustomJsonParser", description: "Extract and validate custom_json payloads." },
            { name: "keychain", type: "KeychainClient", description: "Browser signing through the Hive Keychain extension." },
            { name: "blocks", type: "BlockWatcher", description: "The core block stream as a raw async iterator." },
            { name: "customJson", type: "CustomJsonWatcher", description: "parse() plus a filtered view of the core stream." },
            { name: "payments", type: "PaymentClient", description: "Native HIVE/HBD and Layer 2 payments, parse, validate, watch." },
            { name: "reader", type: "ReaderClient", description: "Single transaction reads and the unified multi-filter stream." },
            { name: "issuer", type: "IssuerClient", description: "Backend Hive Engine token and NFT operations." },
          ]}
        />
        <Prose>
          <p>
            There is exactly one blockchain streaming engine. <code>hive.blocks.watch()</code>,{" "}
            <code>hive.customJson.watch()</code>, <code>hive.payments.watch()</code> and{" "}
            <code>hive.reader.stream()</code> are all consumers or dispatch layers over that same
            core block reader — never independent polling loops.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="methods" title="Full method map">
        <Prose>
          <p>The complete public surface, grouped by namespace.</p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// ── configuration ────────────────────────────────────────────────
hive.configs                  // your configuration object, frozen
hive.account(alias) | listAccounts() | resolveAccount(alias)
hive.endpoint

// ── blockchain access ────────────────────────────────────────────
hive.rpc.call(method, params, options?) -> Promise<T>
hive.rpc.getDynamicGlobalProperties(options?) | getHeadBlockNumber(options?)
hive.rpc.getBlock(blockNumber, options?) | resetEndpoint()
hive.beacon.getNodes(options?) | getHealthyNodes(options?) | getBestEndpoint(options?)

// ── frontend signing (Hive Keychain) ─────────────────────────────
hive.keychain.isAvailable() -> boolean
hive.keychain.requestSignIn({ username, message, authority? })
hive.keychain.customJson({ username, id, action, metadata?, authority?, message? })
hive.keychain.customJsonRaw({ username, id, json, authority?, message? })
hive.keychain.requestTransfer({ username, to, amount, currency, memo, enforce? })
  // currency "HIVE" | "HBD" -> native transfer; any token symbol -> Hive Engine token transfer
hive.keychain.payments.hive.transfer({ username, account, amount, symbol, action, metadata?, message? })
hive.keychain.payments.engine.transfer({ username, account, symbol, quantity, action, metadata?, message? })
hive.keychainIssuer.token.issue | transfer | burn      (+ buildIssue | buildTransfer | buildBurn)
hive.keychainIssuer.token.create({ username, symbol, name, precision, maxSupply, url?, skipChecks? })
  // checks BEE balance vs the creation fee and that the symbol is free before signing
hive.keychainIssuer.token.checkCreate({ username, symbol })  -> TokenCreationCheck (read-only)
hive.keychainIssuer.token.buildCreate(input)                 -> offline payload preview
hive.keychainIssuer.nft.issue | issueMultiple | transfer | burn  (+ build* variants)
hive.keychainIssuer.nft.create({ username, name, symbol, orgName?, productName?,
                                 maxSupply?, website?, authorizedIssuingAccounts?,
                                 authorizedIssuingContracts?, skipChecks? })
hive.keychainIssuer.nft.checkCreate({ username, symbol })    -> NftCreationCheck (read-only)
hive.keychainIssuer.nft.buildCreate(input)                   -> offline payload preview

// ── streaming: ONE engine, four views ────────────────────────────
hive.blocks.watch(options)          -> AsyncGenerator<NormalizedBlock>
hive.customJson.parse(operation, options?) -> CustomJsonEvent | null
hive.customJson.watch(options)      -> AsyncGenerator<CustomJsonEvent>
hive.payments.watch(options)        -> AsyncGenerator<ParsedPayment>
hive.reader.stream(options)         -> StreamEngine
  engine.customJson(filter) | payment(filter) | onEvent(handler) -> StreamSubscription
  engine.start() | stop() | pause() | resume() | clearFilters()

// ── reading ──────────────────────────────────────────────────────
hive.reader.transaction({ transactionId, id?, actions? }) -> TransactionResult

// ── payments ─────────────────────────────────────────────────────
hive.payments.parse({ transactionId })              -> ParsedPayment[]
hive.payments.validate({ transactionId, expected? }) -> ParsedPayment
hive.payments.hive.build(input) | transfer(input)    // native HIVE / HBD
hive.payments.engine.build(input) | transfer(input)  // Layer 2 tokens
hive.payments.engineRpc.getTransactionInfo(id) | findOne(params)

// ── issuing (backend, signed with a resolved key) ────────────────
hive.issuer.token.issue | transfer | burn   (+ buildIssue | buildTransfer | buildBurn)
hive.issuer.token.create({ from, symbol, name, precision, maxSupply, url?, skipChecks? })
hive.issuer.token.checkCreate(input) | buildCreate(input)   // input takes { from, symbol, … }
hive.issuer.nft.issue | issueMultiple | transfer | burn (+ build* variants) | countInstances
hive.issuer.nft.create({ from, name, symbol, orgName?, productName?, maxSupply?,
                         website?, authorizedIssuingAccounts?, authorizedIssuingContracts?,
                         skipChecks? })
hive.issuer.nft.checkCreate(input) | buildCreate(input)     // input takes { from, symbol, … }
// burn is implemented as a transfer to "null"`}
        />
      </DocSection>

      <DocSection id="configs" title="hive.configs">
        <CodeBlock
          language="typescript"
          code={`hive.configs;                      // exactly what you passed, frozen
hive.configs.tests.accounts.minter; // your own nested structure

hive.listAccounts();               // ["treasury"]
hive.account("treasury");          // AccountReference (no keys)
hive.resolveAccount("treasury");   // { alias, account }`}
        />
      </DocSection>

      <DocSection id="rpc" title="hive.rpc / hive.beacon">
        <CodeBlock
          language="typescript"
          code={`const head = await hive.rpc.getHeadBlockNumber();
const props = await hive.rpc.getDynamicGlobalProperties();
const block = await hive.rpc.getBlock(head);

// Any node method, typed by the caller.
const [account] = await hive.rpc.call<Account[]>(
  "condenser_api.get_accounts",
  [["alice"]],
);

// Node discovery. resetEndpoint() clears a sticky failed node.
const nodes = await hive.beacon.getHealthyNodes();
const best = await hive.beacon.getBestEndpoint();
hive.rpc.resetEndpoint();`}
        />
      </DocSection>

      <DocSection id="keychain" title="hive.keychain">
        <CodeBlock
          language="typescript"
          code={`if (!hive.keychain.isAvailable()) throw new Error("Install Hive Keychain");

const signIn = await hive.keychain.requestSignIn({
  username: "alice",
  message: "Sign in to my-application: nonce-123456",
  authority: "posting",
});

// Standardized { action, metadata } payload.
await hive.keychain.customJson({
  username: "alice",
  id: "my-application",
  action: "claim_reward",
  metadata: { questId: 42 },
  authority: "posting",      // "posting" | "active"
  message: "Claim your reward",
});

// Raw, already-serialized body — broadcast verbatim.
await hive.keychain.customJsonRaw({
  username: "alice",
  id: "my-application",
  json: JSON.stringify({ action: "ping", metadata: null }),
});

// Native transfer with a standardized trigger in the memo.
await hive.keychain.requestTransfer({
  username: "alice",
  to: "treasury",
  amount: "1.000",
  currency: "HIVE",             // "HIVE" | "HBD" -> Layer 1 transfer
  memo: JSON.stringify({ action: "buy_pack", metadata: { packs: 1 } }),
  enforce: true,
});

// Layer 2 token transfer — same call, just use the token symbol as currency.
await hive.keychain.requestTransfer({
  username: "alice",
  to: "treasury",
  amount: "5",
  currency: "SCRAP",            // any Hive Engine symbol -> token transfer
  memo: JSON.stringify({ action: "buy_pack", metadata: { packs: 1 } }),
});

// Layer 2 contract actions signed by the user's own keys (custom_json).
await hive.keychainIssuer.token.transfer({
  username: "alice",
  symbol: "SCRAP",
  account: "bob",
  quantity: "5",
});`}
        />
      </DocSection>

      <DocSection id="sign-in" title="Keychain sign-in">
        <Prose>
          <p>
            Added in 1.2.0. <code>requestSignIn()</code> asks Hive Keychain to sign a challenge
            message with the account's key, so your backend can verify the signature and issue a
            session. Use a server-issued nonce in the message to prevent replays.
          </p>
        </Prose>
        <ParamTable
          caption="KeychainSignInInput"
          rows={[
            { name: "username", type: "string (required)", description: "Hive account signing in." },
            { name: "message", type: "string (required)", description: "Challenge to sign. Include a server-issued nonce." },
            { name: "authority", type: '"posting" | "active"', description: 'Key used for the signature. Defaults to "posting".' },
          ]}
        />
        <ParamTable
          caption="KeychainSignInResult"
          rows={[
            { name: "username", type: "string", description: "Account that signed." },
            { name: "message", type: "string", description: "Exact challenge that was signed." },
            { name: "authority", type: '"posting" | "active"', description: "Key authority used." },
            { name: "signature", type: "string", description: "Signature to verify server-side." },
            { name: "timestamp", type: "number", description: "Client timestamp of the signature." },
            { name: "raw", type: "KeychainResponse", description: "Untouched Keychain response." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`const { nonce } = await fetch("/api/auth/nonce").then((r) => r.json());

const signIn = await hive.keychain.requestSignIn({
  username: "alice",
  message: \`Sign in to my-application: \${nonce}\`,
  authority: "posting",
});

await fetch("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    username: signIn.username,
    message: signIn.message,
    signature: signIn.signature,
  }),
});`}
        />
      </DocSection>

      <DocSection id="creation" title="Token & NFT creation">
        <Prose>
          <p>
            Added in 1.2.0. Both a token and an NFT cost 100 BEE to create on Hive Engine and both
            symbols are unique on the sidechain, so every <code>create()</code> runs a preflight
            first: the signing account must hold the fee in BEE and the symbol must still be free.
            A failure throws <code>INSUFFICIENT_BEE</code>, <code>TOKEN_ALREADY_EXISTS</code> or{" "}
            <code>NFT_ALREADY_EXISTS</code> before Keychain opens or a key is resolved. Pass{" "}
            <code>skipChecks: true</code> to opt out — creation fees are non-refundable.
          </p>
          <p>
            The same methods exist on both issuers: <code>hive.keychainIssuer</code> (browser,
            signed by the user) and <code>hive.issuer</code> (backend, signed with a resolved key).
          </p>
        </Prose>
        <ParamTable
          caption="Token creation — tokens.create"
          rows={[
            { name: "name", type: "string (required)", description: "Display name, up to 50 letters, digits and spaces." },
            { name: "symbol", type: "string (required)", description: "Uppercase letters only, up to 10 characters." },
            { name: "precision", type: "number (required)", description: "Decimal places, 0 to 8." },
            { name: "maxSupply", type: "string (required)", description: "Positive decimal string. Never a float." },
            { name: "url", type: "string", description: "Optional website. Editable later in the TribalDex Token Manager." },
            { name: "skipChecks", type: "boolean", description: "Skips the BEE / symbol preflight. Off by default." },
          ]}
        />
        <ParamTable
          caption="NFT creation — nft.create"
          rows={[
            { name: "name", type: "string (required)", description: "Display name, up to 50 letters, digits and spaces." },
            { name: "symbol", type: "string (required)", description: "Uppercase letters only, up to 10 characters." },
            { name: "orgName / productName", type: "string", description: "Optional organization and product names." },
            { name: "maxSupply", type: "string", description: "Optional positive decimal string. Unlimited when omitted." },
            { name: "website", type: "string", description: "Optional project website." },
            { name: "authorizedIssuingAccounts", type: "string[]", description: "Optional accounts allowed to issue instances." },
            { name: "authorizedIssuingContracts", type: "string[]", description: "Optional contracts allowed to issue instances." },
            { name: "skipChecks", type: "boolean", description: "Skips the BEE / symbol preflight. Off by default." },
          ]}
        />
        <ParamTable
          caption="TokenCreationCheck / NftCreationCheck"
          rows={[
            { name: "fee / balance", type: "string", description: "BEE required by the sidechain and the account's liquid BEE balance." },
            { name: "hasEnoughBee", type: "boolean", description: "Balance covers the fee." },
            { name: "symbolExists", type: "boolean", description: "The symbol is already taken." },
            { name: "existingToken / existingNft", type: "EngineTokenRow | EngineNftRow | null", description: "The existing row when the symbol is taken." },
            { name: "ok", type: "boolean", description: "True only when the fee is affordable and the symbol is free." },
            { name: "issues", type: "string[]", description: "Human-readable reasons creation would fail." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`// ── Keychain (browser, user signs with their Active key) ─────────
const check = await hive.keychainIssuer.token.checkCreate({
  username: "alice",
  symbol: "SCRAP",
});
check.ok; check.fee; check.balance; check.issues;

await hive.keychainIssuer.token.create({
  username: "alice",
  name: "Scrap Token",
  symbol: "SCRAP",
  precision: 3,
  maxSupply: "1000000",
  url: "https://scrap.gg",   // optional
});

await hive.keychainIssuer.nft.create({
  username: "alice",
  name: "Raider Cards",
  symbol: "CARD",
  orgName: "Idle Raiders",   // optional
  maxSupply: "10000",        // optional
});

// ── Backend (signed with a resolved key) ─────────────────────────
const preview = hive.issuer.token.buildCreate({
  symbol: "SCRAP",
  name: "Scrap Token",
  precision: 3,
  maxSupply: "1000000",
});   // offline payload, no network

await hive.issuer.token.create({
  from: hive.accounts.treasury,
  name: "Scrap Token",
  symbol: "SCRAP",
  precision: 3,
  maxSupply: "1000000",
});

await hive.issuer.nft.create({
  from: hive.accounts.treasury,
  name: "Raider Cards",
  symbol: "CARD",
});`}
        />
      </DocSection>

      <DocSection id="blocks" title="hive.blocks.watch()">
        <Prose>
          <p>
            The raw core stream. Every other streaming API is built on it, so use this only when you
            need untouched blocks.
          </p>
        </Prose>
        <ParamTable
          caption="BlockStreamOptions"
          rows={[
            { name: "fromBlock", type: "number", description: "First block to read. Defaults to the head block (live)." },
            { name: "signal", type: "AbortSignal", description: "Stops the iterator cleanly." },
            { name: "pollIntervalMs", type: "number", description: "Poll interval while waiting for new blocks. Default 3000." },
            { name: "onError", type: "(error, blockNumber) => void", description: "Called on recoverable RPC errors instead of throwing." },
            { name: "maxRetriesPerBlock", type: "number", description: "Consecutive failures on one block before throwing. Default 5." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`const controller = new AbortController();

for await (const block of hive.blocks.watch({
  fromBlock: 109_542_165,
  pollIntervalMs: 3000,
  signal: controller.signal,
  onError: (error, blockNumber) => console.warn(blockNumber, error),
})) {
  console.log(block.blockNumber, block.transactions.length);
}

controller.abort();`}
        />
      </DocSection>

      <DocSection id="custom-json" title="hive.customJson">
        <ParamTable
          caption="CustomJsonStreamOptions (extends BlockStreamOptions)"
          rows={[
            { name: "id", type: "string (required)", description: "custom_json id to filter by." },
            { name: "actions", type: "string[]", description: "Action allow-list, OR-matched against the payload action." },
            { name: "onInvalidPayload", type: "({ reason, blockNumber, raw }) => void", description: "Called when the id matches but the payload breaks the protocol. Never throws." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`// One-off parse of a single operation (needs the block position context).
const result = hive.customJson.parse(operation, position, { id: "my-application" });
if (result.status === "ok") console.log(result.event.action, result.event.metadata);

// Filtered async iteration over the core stream.
for await (const event of hive.customJson.watch({
  id: "my-application",
  actions: ["claim_reward", "buy_pack"],   // OR filter
  fromBlock: 109_542_165,
  onInvalidPayload: ({ reason, blockNumber }) => console.warn(blockNumber, reason),
})) {
  console.log(event.account, event.action, event.metadata);
}`}
        />
      </DocSection>

      <DocSection id="payments" title="hive.payments">
        <ParamTable
          caption="PaymentStreamOptions (extends BlockStreamOptions)"
          rows={[
            { name: "filters.from", type: "string", description: "Sender account." },
            { name: "filters.account", type: "string", description: "Recipient account." },
            { name: "filters.symbol", type: "string", description: "HIVE, HBD or any Layer 2 token symbol." },
            { name: "filters.quantity", type: "string", description: "Exact amount, compared as a decimal string." },
            { name: "filters.actions", type: "string[]", description: "Trigger actions, OR-matched. Implies a valid trigger." },
            { name: "filters.requireTrigger", type: "boolean", description: "Only emit transfers carrying a valid standardized trigger." },
            { name: "onSuccess", type: "(payment) => void", description: "Verified payments (success === true)." },
            { name: "onFailed", type: "(payment) => void", description: "Payments whose Layer 2 execution failed." },
          ]}
        />
        <CodeBlock
          language="typescript"
           code={`// Build and send — native HIVE / HBD.
const preview = hive.payments.hive.build({
  from: hive.accounts.treasury,
  account: "bob",             // recipient
  amount: "1.000",            // decimal string
  symbol: "HIVE",             // "HIVE" or "HBD"
  action: "payout",
  metadata: { invoice: "INV-1" },
});
preview.amount; // "1.000 HIVE"
preview.memo;     // serialized trigger
await hive.payments.hive.transfer(preview);

// Build and send — Layer 2 token.
await hive.payments.engine.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  symbol: "SCRAP",
  quantity: "1",
  action: "payout",
  metadata: { invoice: "INV-2" },
});

// Read a transaction's payments without execution checks.
const payments = await hive.payments.parse({ transactionId: "7b064a84…" });

// Verify one payment against expectations.
const result = await hive.payments.validate({
  transactionId: "7b064a84…",
  expected: { account: "rhiaji", symbol: "SCRAP", quantity: "1", action: "buy_pack" },
});
result.status; // "success" | "failed" | "pending" | "invalid" | "not_found"

// Preferred live iteration.
for await (const payment of hive.payments.watch({
  filters: { account: "rhiaji", symbol: "SCRAP", actions: ["buy_pack"] },
  onFailed: (failed) => console.warn("execution failed", failed.transactionId),
})) {
  if (payment.trigger) fulfil(payment.trigger.action, payment.trigger.metadata);
}

// Raw sidechain access when you need it.
await hive.payments.engineRpc.getTransactionInfo("7b064a84…");`}
        />
      </DocSection>

      <DocSection id="reader" title="hive.reader">
        <ParamTable
          caption="UnifiedStreamOptions (extends BlockStreamOptions)"
          rows={[
            { name: "engineConfirmationAttempts", type: "number", description: "Re-reads of a pending Layer 2 execution before giving up. Default 6." },
            { name: "engineConfirmationDelayMs", type: "number", description: "Delay between Layer 2 execution reads, in ms. Default 2000." },
          ]}
        />
        <ParamTable
          caption="CustomJsonFilter"
          rows={[
            { name: "id", type: "string", description: "custom_json id, e.g. \"my-game\"." },
            { name: "actions", type: "string[]", description: "OR-matched against the standardized payload action." },
            { name: "standardizedOnly", type: "boolean", description: "Only match payloads following the { action, metadata } protocol." },
            { name: "handler", type: "(event) => void (required)", description: "Receives every matching CustomJsonStreamEvent." },
          ]}
        />
        <ParamTable
          caption="PaymentFilter"
          rows={[
            { name: "from / account / symbol", type: "string", description: "Sender, recipient and currency or token symbol." },
            { name: "quantity", type: "string", description: "Decimal string, compared precision-safely. Never a number." },
            { name: "actions", type: "string[]", description: "Trigger actions, OR-matched. Implies a valid trigger." },
            { name: "requireTrigger", type: "boolean", description: "Only match transfers carrying a valid standardized trigger." },
            { name: "handler", type: "(event) => void (required)", description: "Verified successful payments only." },
            { name: "onFailed", type: "(event) => void", description: "Matching payments whose Layer 2 execution failed." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`// One transaction, decoded.
const read = await hive.reader.transaction({
  transactionId: "7b064a84…",
  id: "my-application",   // optional custom_json id filter
});
read.blockNumber; read.operations; read.customJson; read.payments; read.nfts; read.invalid;

// One engine, one block reader, many filters.
const stream = hive.reader.stream({
  fromBlock: 109_542_165,
  engineConfirmationAttempts: 6,
  engineConfirmationDelayMs: 2000,
});

const offJson = stream.customJson({
  id: "my-application",
  actions: ["claim_reward"],
  standardizedOnly: true,
  handler: (event) => console.log(event.account, event.action, event.metadata),
});

const offPay = stream.payment({
  account: "rhiaji",
  symbol: "SCRAP",
  actions: ["buy_pack"],
  handler: (event) => fulfil(event.trigger?.action, event.trigger?.metadata),
  onFailed: (event) => console.warn("failed", event.transactionId, event.error),
});

// Firehose of every normalized event produced by the registered filters.
stream.onEvent((event) => {
  if (event.type === "custom_json") console.log(event.id, event.action);
  else console.log(event.transfer.symbol, event.status);
});

await stream.start();
stream.pause();
stream.resume();
offJson.unsubscribe();
offPay();              // subscriptions are callable too
stream.clearFilters();
stream.stop();`}
        />
      </DocSection>

      <DocSection id="issuer" title="hive.issuer">
        <CodeBlock
          language="typescript"
          code={`// Offline preview: no key resolution, no network.
const preview = hive.issuer.token.buildTransfer({
  from: hive.accounts.treasury,
  symbol: "SCRAP",
  account: "bob",
  quantity: "5",
});
preview.alias; preview.account; preview.id; preview.json; preview.operation;

// Broadcast variants.
await hive.issuer.token.issue({ from: hive.accounts.treasury, symbol: "SCRAP", account: "bob", quantity: "10" });
await hive.issuer.token.transfer({ from: hive.accounts.treasury, symbol: "SCRAP", account: "bob", quantity: "5" });
await hive.issuer.token.burn({ from: hive.accounts.treasury, symbol: "SCRAP", quantity: "5" }); // transfer to "null"

// NFTs.
await hive.issuer.nft.issue({
  from: hive.accounts.treasury,
  symbol: "CARD",
  account: "bob",
  feeSymbol: "BEE",
  properties: { rarity: "rare" },
});
await hive.issuer.nft.issueMultiple({
  from: hive.accounts.treasury,
  instances: [
    { symbol: "CARD", account: "bob", feeSymbol: "BEE" },
    { symbol: "CARD", account: "carol", feeSymbol: "BEE" },
  ],
});
await hive.issuer.nft.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  nfts: [{ symbol: "CARD", ids: ["1", "2"] }],
});
await hive.issuer.nft.burn({
  from: hive.accounts.treasury,
  symbol: "CARD",
  id: "3", // string | string[]
});
hive.issuer.nft.countInstances({ nfts: [{ symbol: "CARD", ids: ["1", "2"] }] }); // 2`}
        />
      </DocSection>

      <DocSection id="branches" title="Every result branch">
        <Prose>
          <p>
            Payments are normalized to one shape for both networks, so branching is the same code
            path whether the transfer was native HIVE/HBD or a Layer 2 token.
          </p>
        </Prose>
        <ParamTable
          caption="PaymentStatus"
          rows={[
            { name: "success", type: "success === true", description: "The transfer and, for Layer 2, its execution succeeded." },
            { name: "failed", type: "success === false", description: "The transaction exists but execution failed." },
            { name: "pending", type: "success === null", description: "Not yet indexed enough to verify — retried automatically while streaming." },
            { name: "invalid", type: "success === false", description: "The transaction exists but does not match expectations." },
            { name: "not_found", type: "success === false", description: "The transaction cannot be found." },
          ]}
        />
        <CodeBlock
          language="typescript"
          code={`switch (payment.status) {
  case "success":   return fulfil(payment);
  case "failed":    return refund(payment);
  case "pending":   return retryLater(payment);
  case "invalid":   return flagMismatch(payment);
  case "not_found": return ignore(payment);
}

// Trigger branches — a bad memo never breaks the stream.
if (payment.trigger) {
  handle(payment.trigger.action, payment.trigger.metadata);
} else {
  // empty, plain-text or malformed memo: surfaced, but not processed
  log("no trigger", payment.transactionId);
}

// Custom JSON branches.
if (event.standardized && event.customJson) {
  handle(event.action, event.metadata);
} else {
  inspectRaw(event.json);   // raw protocol payload, still emitted
}

// Idempotency key for both event kinds.
const key = \`\${payment.transactionId}:\${payment.operationIndex ?? 0}\`;`}
        />
      </DocSection>
    </DocPage>
  );
}
