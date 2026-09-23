import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/types")({
  head: () => ({
    meta: [
      { title: "Types — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Every exported TypeScript type of the HiveXPH SDK: protocol payloads, Custom JSON events, stream events and filters, payments, issuer inputs, NFT inputs, configuration, transactions, RPC, Beacon, Keychain and error codes.",
      },
      { property: "og:title", content: "Types — HiveXPH SDK" },
      {
        property: "og:description",
        content:
          "Complete reference of the SDK's exported TypeScript types, grouped by namespace, with generics and usage examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TypesPage,
});

const toc = [
  { id: "overview", label: "Type map" },
  { id: "generics", label: "Generics" },
  { id: "protocol", label: "Protocol payloads" },
  { id: "custom-json", label: "Custom JSON" },
  { id: "blocks", label: "Blocks and RPC" },
  { id: "streaming", label: "Stream options" },
  { id: "unified", label: "Unified stream events" },
  { id: "filters", label: "Unified stream filters" },
  { id: "payments", label: "Payments" },
  { id: "payment-inputs", label: "Payment inputs" },
  { id: "reader", label: "Reader" },
  { id: "issuer", label: "Issuer" },
  { id: "token", label: "Token inputs" },
  { id: "nft", label: "NFT inputs" },
  { id: "engine", label: "Hive Engine" },
  { id: "config", label: "Configuration" },
  { id: "environment", label: "Environment" },
  { id: "transactions", label: "Transactions" },
  { id: "beacon", label: "Beacon" },
  { id: "keychain", label: "Keychain" },
  { id: "errors", label: "Errors" },
  { id: "constants", label: "Constants" },
];

function TypesPage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Types"
      description="Every type the SDK exports, grouped by namespace. Metadata is generic throughout: parameterize the payload type once and it flows through building, streaming, reading and validating."
      path="/docs/types"
      toc={toc}
    >
      <DocSection id="overview" title="Type map">
        <Prose>
          <p>
            All types are importable from the package root with{" "}
            <code>import type {"{ ... }"} from "hivexph-sdk"</code>. Nothing is nested behind a
            sub-path.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// ── protocol ─────────────────────────────────────────────────────
ActionPayload<T> | ActionPayloadInput<T>

// ── custom_json ──────────────────────────────────────────────────
HiveAuthority | CustomJsonPayload<T> | CustomJsonInput<T>
CustomJsonOperationValue | CustomJsonEvent<T>
CustomJsonOperationInput<T> | BuiltCustomJsonOperation<T>

// ── blocks / rpc ─────────────────────────────────────────────────
HiveBlock | NormalizedBlock | HiveTransaction | HiveOperation
DynamicGlobalProperties | RpcClientOptions | NodeSelectorOptions

// ── streaming ────────────────────────────────────────────────────
BlockStreamOptions | CustomJsonStreamOptions | UnifiedStreamOptions
StreamEventType | StreamEventPosition | StreamEvent<T>
CustomJsonStreamEvent<T> | PaymentStreamEvent<T> | PaymentSource
CustomJsonFilter<T> | PaymentFilter<T> | StreamHandler<E> | StreamSubscription

// ── payments ─────────────────────────────────────────────────────
PaymentNetwork | PaymentStatus | PaymentTrigger<T> | PaymentTransfer
ParsedPayment<T> | PaymentValidationResult<T> | PaymentExpectation
PaymentParseInput | PaymentValidateInput
PaymentStreamFilters | PaymentStreamOptions<T>
HivePaymentInput<T> | BuiltHiveTransfer<T> | HiveTransferInput<T> | HiveTransferPreview
EnginePaymentInput<T> | BuiltEngineTransfer<T> | EngineTransferInput<T>
EngineRpcOptions | EngineTransactionInfo | EngineExecutionResult | NativeSymbol

// ── reader ───────────────────────────────────────────────────────
ReadTransactionInput | TransactionResult<T>

// ── issuer ───────────────────────────────────────────────────────
IssuerOperationOptions | IssuerOperationPreview | IssuerTransactionResult | IssuerContext
TokenIssueInput | TokenTransferInput | TokenBurnInput
NftAccountType | NftLockNfts | NftIssueInput<P> | NftIssueInstance<P>
NftIssueMultipleInput<P> | NftTransferItem | NftTransferInput | NftBurnInput
NftTransactionResult

// ── hive engine ──────────────────────────────────────────────────
HiveEngineContractAction<P> | TokenContractActionName | NftContractActionName
TokenActionInput | TokenBurnActionInput

// ── configuration ────────────────────────────────────────────────
HiveClientOptions | HiveRuntimeOptions | HiveClientConfig | HiveConfig
HiveConfigs | HiveAccountConfig | AccountReference | ResolvedAccount

// ── environment / transactions ───────────────────────────────────
EnvironmentResolver | UnsignedTransaction | SignedTransaction

// ── beacon ───────────────────────────────────────────────────────
BeaconNode | BeaconNodeRaw | BeaconFetchOptions

// ── keychain ─────────────────────────────────────────────────────
KeychainTransferInput | KeychainCustomJsonInput<T> | KeychainCustomJsonRawInput
KeychainSignInInput | KeychainSignInResult | KeychainResult | KeychainResponse | KeychainIssuerOptions
KeychainHivePaymentInput<T> | KeychainEnginePaymentInput<T>

// ── errors ───────────────────────────────────────────────────────
HiveSdkError (class) | HiveSdkErrorCode`}
        />
      </DocSection>

      <DocSection id="generics" title="Generics">
        <Prose>
          <p>
            Two generic parameters appear throughout. <code>T</code> is always the shape of your{" "}
            <code>metadata</code> (Custom JSON payloads, payment triggers). <code>P</code> /{" "}
            <code>TProperties</code> is the NFT <code>properties</code> object. Both default to{" "}
            <code>Record&lt;string, unknown&gt;</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`interface ClaimMetadata { questId: number; reward: string }
interface PackTrigger { packs: number }

// The type flows through every layer:
hive.builder.buildOperation<ClaimMetadata>({ action: "claim", metadata: { questId: 1, reward: "SCRAP" } });
for await (const e of hive.customJson.watch<ClaimMetadata>({ id: "my-game" })) {
  e.metadata?.questId; // number | undefined
}
const [p] = await hive.payments.parse<PackTrigger>({ transactionId });
p.trigger?.metadata.packs; // number

hive.reader.stream().customJson<ClaimMetadata>({ id: "my-game", handler: (e) => e.metadata });
hive.reader.stream().payment<PackTrigger>({ symbol: "HIVE", handler: (p) => p.trigger });

// NFT properties
await hive.issuer.nft.issue<{ rarity: "rare" | "epic" }>({ ..., properties: { rarity: "epic" } });`}
        />
      </DocSection>

      <DocSection id="protocol" title="Protocol payloads">
        <Prose>
          <p>
            One payload shape for every transport: Custom JSON bodies, native transfer memos and
            Layer 2 transfer memos. There are no timestamps — the blockchain is the clock.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`/** Normalized payload. metadata is always present, possibly null. */
interface ActionPayload<T = Record<string, unknown>> {
  action: string;
  metadata: T | null;
}

/** Developer input; metadata may be omitted (defaults to null). */
interface ActionPayloadInput<T = Record<string, unknown>> {
  action: string;
  metadata?: T | null;
}

// Aliases used by specific transports — identical shapes:
type CustomJsonPayload<T> = ActionPayload<T>;   // custom_json body
type CustomJsonInput<T>   = ActionPayloadInput<T>;
type PaymentTrigger<T>    = ActionPayload<T>;   // transfer memo`}
        />
      </DocSection>

      <DocSection id="custom-json" title="Custom JSON">
        <CodeBlock
          language="typescript"
          code={`type HiveAuthority = "posting" | "active";

/** Raw Hive custom_json operation body, as found on chain. */
interface CustomJsonOperationValue {
  required_auths: string[];
  required_posting_auths: string[];
  id: string;
  json: string;
}

/** Input for hive.builder.build() */
interface CustomJsonOperationInput<T = Record<string, unknown>> extends CustomJsonInput<T> {
  username: string;
  id: string;
  authority?: HiveAuthority;   // default "posting"
}

/** Output of hive.builder.build() — ready to broadcast. */
interface BuiltCustomJsonOperation<T = Record<string, unknown>> {
  required_auths: string[];
  required_posting_auths: string[];
  id: string;
  json: string;
  payload: CustomJsonPayload<T>;   // pre-serialization, for debugging
}

/** Normalized standardized event produced by hive.customJson.watch() and hive.reader. */
interface CustomJsonEvent<T = Record<string, unknown>> {
  /** Deterministic: \`\${blockNumber}-\${transactionIndex}-\${operationIndex}\` */
  eventId: string;
  transactionId: string;
  blockNumber: number;
  blockTimestamp: string;        // ISO string from the block
  transactionIndex: number;
  operationIndex: number;
  /** Signing account, when exactly one authority is present; otherwise null. */
  account: string | null;
  id: string;
  action: string;
  metadata: T | null;
  requiredAuths: string[];
  requiredPostingAuths: string[];
  raw: unknown;                   // the original operation
}`}
        />
        <Callout tone="info" title="eventId is your idempotency key">
          Block number + transaction index + operation index is unique on chain and stable across
          restarts, so store it to deduplicate replays after a <code>fromBlock</code> rewind.
        </Callout>
      </DocSection>

      <DocSection id="blocks" title="Blocks and RPC">
        <CodeBlock
          language="typescript"
          code={`/** condenser_api tuple: ["custom_json", { ... }] */
type CondenserOperation = [string, Record<string, unknown>];
/** *_api object: { type: "custom_json_operation", value: { ... } } */
interface ApiOperation { type: string; value: Record<string, unknown> }
type HiveOperation = CondenserOperation | ApiOperation;

interface HiveTransaction {
  operations: HiveOperation[];
  [key: string]: unknown;
}

interface HiveBlock {
  block_id?: string;
  previous?: string;
  timestamp: string;
  transactions: HiveTransaction[];
  transaction_ids?: string[];
  [key: string]: unknown;
}

/** Canonical normalized block yielded by hive.blocks.watch(). */
interface NormalizedBlock {
  blockNumber: number;
  blockId: string | null;
  timestamp: string;
  transactions: NormalizedTransaction[];
  raw: HiveBlock;              // exactly what the RPC node returned
}

interface NormalizedTransaction {
  transactionId: string | null;   // null when the node omits transaction_ids
  transactionIndex: number;
  operations: NormalizedOperation[];
}

interface NormalizedOperation {
  operationIndex: number;
  operationType: string;       // "custom_json", "transfer", ...
  operation: HiveOperation;    // raw operation, either RPC representation
}

interface DynamicGlobalProperties {
  head_block_number: number;
  last_irreversible_block_num: number;
  time: string;
  [key: string]: unknown;
}

interface NodeSelectorOptions {
  endpoint?: string;          // hard override: no discovery, no failover
  fallbackEndpoint?: string;  // used when the Beacon node fails
  beacon?: BeaconClient;
  minScore?: number;
}
interface RpcClientOptions extends NodeSelectorOptions {
  maxAttempts?: number;       // endpoints tried per call, default 3
}`}
        />
      </DocSection>

      <DocSection id="streaming" title="Stream options">
        <Prose>
          <p>
            Every <code>watch()</code> and <code>stream()</code> accepts the same base options.
            The engine is one block reader; these options control it.
          </p>
        </Prose>
        <ParamTable
          caption="BlockStreamOptions — hive.blocks.watch()"
          rows={[
            { name: "fromBlock", type: "number", description: "First block to read. Defaults to the current head block (live)." },
            { name: "signal", type: "AbortSignal", description: "Stops the iterator cleanly." },
            { name: "pollIntervalMs", type: "number", description: "Wait between polls at the head. Default 3000." },
            { name: "onError", type: "(error, blockNumber) => void", description: "Called on recoverable RPC errors instead of throwing." },
            { name: "maxRetriesPerBlock", type: "number", description: "Consecutive failures on one block before the iterator throws. Default 5." },
          ]}
        />
        <ParamTable
          caption="CustomJsonStreamOptions extends BlockStreamOptions — hive.customJson.watch()"
          rows={[
            { name: "id", type: "string", required: true, description: "custom_json id to filter by." },
            { name: "actions", type: "string[]", description: "Action allow-list, OR-matched." },
            { name: "onInvalidPayload", type: "({ reason, blockNumber, raw }) => void", description: "Matching id but broken protocol." },
          ]}
        />
        <ParamTable
          caption="PaymentStreamOptions<T> extends BlockStreamOptions — hive.payments.watch()"
          rows={[
            { name: "filters", type: "PaymentStreamFilters", description: "from, account, symbol, quantity, actions[], requireTrigger." },
            { name: "onSuccess", type: "(payment: ParsedPayment<T>) => void", description: "Verified payments only (success === true)." },
            { name: "onFailed", type: "(payment: ParsedPayment<T>) => void", description: "Layer 2 execution failed (success === false)." },
          ]}
        />
        <ParamTable
          caption="UnifiedStreamOptions extends BlockStreamOptions — hive.reader.stream()"
          rows={[
            { name: "engineConfirmationAttempts", type: "number", description: "Re-reads of a pending Layer 2 execution before giving up. Default 6." },
            { name: "engineConfirmationDelayMs", type: "number", description: "Delay between Layer 2 reads in ms. Default 2000." },
          ]}
        />
      </DocSection>

      <DocSection id="unified" title="Unified stream events">
        <Prose>
          <p>
            <code>hive.reader.stream()</code> emits two event kinds, discriminated by{" "}
            <code>type</code>. Both share the same blockchain position fields.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`type StreamEventType = "custom_json" | "payment";

interface StreamEventPosition {
  transactionId: string;
  blockNumber: number;
  blockTimestamp: string;
  transactionIndex: number;
  operationIndex: number;
}

/** Any custom_json — standardized OR raw. */
interface CustomJsonStreamEvent<T = Record<string, unknown>> extends StreamEventPosition {
  type: "custom_json";
  account: string | null;
  id: string;
  action: string | null;          // null for raw (non-protocol) payloads
  metadata: T | null;
  standardized: boolean;          // true when { action, metadata } protocol matched
  requiredAuths: string[];
  requiredPostingAuths: string[];
  customJson: CustomJsonEvent<T> | null;  // full event, only when standardized
  json: unknown;                  // parsed body exactly as broadcast
  raw: unknown;
}

/** Informational origin. Never needed for filtering — detection is automatic. */
interface PaymentSource {
  type: "native" | "layer2";
  protocol?: string;              // e.g. "hive-engine"
}

/** Identical shape for HIVE/HBD and Hive Engine tokens. */
interface PaymentStreamEvent<T = unknown> extends ParsedPayment<T> {
  type: "payment";
  blockNumber: number;
  blockTimestamp: string;
  transactionIndex: number;
  operationIndex: number;
  source: PaymentSource;
}

type StreamEvent<T = unknown> = CustomJsonStreamEvent<...> | PaymentStreamEvent<T>;

// Narrowing:
engine.onEvent((event) => {
  if (event.type === "payment") event.transfer.quantity;     // PaymentStreamEvent
  else if (event.standardized) event.customJson!.action;     // CustomJsonStreamEvent
});`}
        />
      </DocSection>

      <DocSection id="filters" title="Unified stream filters">
        <CodeBlock
          language="typescript"
          code={`type StreamHandler<E> = (event: E) => void | Promise<void>;

/** Returned by every registration: call it OR call .unsubscribe(). */
type StreamSubscription = (() => void) & { unsubscribe: () => void };

interface CustomJsonFilter<T = Record<string, unknown>> {
  id?: string;                 // custom_json id
  actions?: string[];          // OR-matched against payload.action
  standardizedOnly?: boolean;  // drop raw protocol payloads
  handler: StreamHandler<CustomJsonStreamEvent<T>>;
}

/** No \`network\` field — native vs Layer 2 is detected by the engine. */
interface PaymentFilter<T = unknown> {
  from?: string;
  account?: string;            // destination
  symbol?: string;             // "HIVE" | "HBD" | any engine token
  quantity?: string;           // decimal string, precision-safe compare
  actions?: string[];          // trigger actions, OR-matched; implies a trigger
  requireTrigger?: boolean;    // only transfers with a valid standardized memo
  handler: StreamHandler<PaymentStreamEvent<T>>;   // verified successful only
  onFailed?: StreamHandler<PaymentStreamEvent<T>>; // Layer 2 execution failed
}`}
        />
        <ParamTable
          caption="Filter matching rules"
          rows={[
            { name: "omitted field", type: "—", description: "Matches everything for that field." },
            { name: "actions", type: "string[]", description: "Any listed action matches (OR). Empty array is treated as omitted." },
            { name: "quantity", type: "string", description: "Compared with quantitiesEqual(): \"1\" equals \"1.000\"." },
            { name: "symbol", type: "string", description: "Case-sensitive, exact." },
            { name: "multiple filters", type: "—", description: "Each filter is evaluated independently on the same block; one operation can hit several handlers." },
          ]}
        />
      </DocSection>

      <DocSection id="payments" title="Payments">
        <CodeBlock
          language="typescript"
          code={`type PaymentNetwork = "hive" | "engine";
type NativeSymbol   = "HIVE" | "HBD";

/**
 * pending   — not yet available to verify execution (Layer 2 indexing lag)
 * success   — transfer AND (for Layer 2) execution succeeded
 * failed    — transaction exists but execution failed
 * invalid   — transaction exists but does not match expectations
 * not_found — transaction cannot be found
 */
type PaymentStatus = "pending" | "success" | "failed" | "invalid" | "not_found";

interface PaymentTransfer {
  from: string;
  account: string;          // destination
  symbol: string;
  quantity: string;         // always a string, never a float
  memo?: string | null;     // raw memo as broadcast
}

/** Output of parse(), validate() and every payment stream. */
interface ParsedPayment<T = unknown> {
  network: PaymentNetwork;
  transactionId: string | null;
  blockNumber?: number;
  operationIndex?: number;  // part of the idempotency key
  success: boolean | null;  // null = execution not verified (parse-only)
  status: PaymentStatus;
  transfer: PaymentTransfer;
  trigger: PaymentTrigger<T> | null;   // null when the memo is not a valid trigger
  error?: string;
  raw?: unknown;
}
type PaymentValidationResult<T = unknown> = ParsedPayment<T>;

/** All optional — only listed fields are checked. */
interface PaymentExpectation {
  from?: string;
  account?: string;
  symbol?: string;
  quantity?: string;
  action?: string;
}

interface PaymentParseInput    { transactionId: string }
interface PaymentValidateInput extends PaymentParseInput { expected?: PaymentExpectation }

interface PaymentStreamFilters {
  from?: string;
  account?: string;
  symbol?: string;
  quantity?: string;
  actions?: string[];
  requireTrigger?: boolean;
}`}
        />
        <ParamTable
          caption="status × success — every branch"
          rows={[
            { name: "success", type: "success: true", description: "Native transfer found, or Layer 2 transfer with successful sidechain execution." },
            { name: "pending", type: "success: null", description: "Layer 2 transaction is on Hive but the sidechain has not indexed it yet. validate() retries; parse() returns immediately." },
            { name: "failed", type: "success: false", description: "Sidechain executed the transfer and logged errors (insufficient balance, bad symbol...). error is populated." },
            { name: "invalid", type: "success: false", description: "Transfer exists but an expected.* field did not match. error names the field." },
            { name: "not_found", type: "success: false", description: "No transfer operation in the transaction, or the transaction does not exist." },
          ]}
        />
      </DocSection>

      <DocSection id="payment-inputs" title="Payment inputs">
        <CodeBlock
          language="typescript"
          code={`// ── native HIVE / HBD ────────────────────────────────────────────
interface HivePaymentInput<T = Record<string, unknown>> {
  account: string;        // destination
  amount: string;         // "10.000" — never a number
  symbol: string;         // "HIVE" | "HBD"
  action: string;
  metadata?: T | null;
}
/** hive.payments.hive.build() output */
interface BuiltHiveTransfer<T = Record<string, unknown>> {
  account: string;
  amount: string;
  symbol: string;
  memo: string;           // serialized { action, metadata }
  payload: ActionPayload<T>;
}
/** Backend: hive.payments.hive.transfer({ from: hive.accounts.treasury, ... }) */
interface HiveTransferInput<T> extends HivePaymentInput<T> { from: AccountReference }
interface HiveTransferPreview {
  alias: string;
  account: string;        // signing account
  destination: string;
  amount: string;
  memo: string;
  operation: unknown[];   // ["transfer", { ... }]
}

// ── Layer 2 (Hive Engine) ────────────────────────────────────────
interface EnginePaymentInput<T = Record<string, unknown>> {
  account: string;
  symbol: string;         // e.g. "SWAP.HIVE", "SCRAP"
  quantity: string;
  action: string;
  metadata?: T | null;
}
/** hive.payments.engine.build() output */
interface BuiltEngineTransfer<T = Record<string, unknown>> {
  id: string;             // "ssc-mainnet-hive"
  engineAction: HiveEngineContractAction;   // tokens.transfer
  memo: string;
  payload: ActionPayload<T>;
}
interface EngineTransferInput<T> extends EnginePaymentInput<T> { from: AccountReference }

// ── sidechain RPC ────────────────────────────────────────────────
interface EngineRpcOptions {
  blockchainUrl?: string; // default https://api.hive-engine.com/rpc/blockchain
  contractsUrl?: string;  // default https://api.hive-engine.com/rpc/contracts
  fetchFn?: typeof fetch;
  timeoutMs?: number;     // default 10000
}
interface EngineTransactionInfo {
  blockNumber?: number;
  transactionId?: string;
  sender?: string;
  contract?: string;
  action?: string;
  payload?: string;
  logs?: string;          // JSON: { errors: [...] } | { events: [...] }
  [key: string]: unknown;
}
interface EngineExecutionResult {
  status: PaymentStatus;
  success: boolean | null;
  error?: string;
  raw?: unknown;
}`}
        />
        <Callout tone="warning" title="Memo size">
          Triggers are serialized into the memo and capped at <code>MAX_MEMO_BYTES</code> (2048).
          Builders throw <code>VALIDATION_ERROR</code> when the payload is larger.
        </Callout>
      </DocSection>

      <DocSection id="reader" title="Reader">
        <CodeBlock
          language="typescript"
          code={`interface ReadTransactionInput {
  transactionId: string;
  id?: string;         // optional custom_json id filter
  actions?: string[];  // optional standardized action filter
}

type TransactionOperationResult<T> =
  | CustomJsonOperationResult<T>   // kind: "custom_json"
  | PaymentOperationResult<T>      // kind: "payment"
  | NftOperationResult             // kind: "nft"
  | UnknownOperationResult;        // kind: "unknown" — never an error

interface TransactionResult<T = Record<string, unknown>> {
  transactionId: string;
  blockNumber: number | null;
  blockTimestamp: string | null;
  transactionIndex: number | null;
  operations: TransactionOperationResult<T>[];   // blockchain order
  customJson: CustomJsonEvent<T>[];              // standardized operations
  payments: ParsedPayment<T>[];                  // triggers already associated
  nfts: NormalizedNftOperation[];                // Hive Engine NFT actions
  invalid: { operationIndex: number; reason: string; raw: unknown }[];
  raw: unknown;                                  // full transaction
}`}
        />
      </DocSection>

      <DocSection id="issuer" title="Issuer">
        <CodeBlock
          language="typescript"
          code={`/** Every issuer input accepts an optional custom_json id override. */
interface IssuerOperationOptions {
  id?: string;   // defaults to config option applicationId (engine ops: "ssc-mainnet-hive")
}

/** Output of every build*() — offline, no keys, no network. */
interface IssuerOperationPreview {
  alias: string;           // resolved configuration alias
  account: string;         // signing account
  destination?: string;    // recipient when applicable
  id: string;              // custom_json id
  json: string;            // serialized body
  operation: unknown[];    // ["custom_json", { ... }]
}

/** Output of every mint / transfer / burn. */
interface IssuerTransactionResult {
  success: boolean;
  transactionId?: string;
  account?: string;
  raw: unknown;            // broadcast response
}

/** Dependencies handed to issuer/payment dispatchers (advanced / custom clients). */
interface IssuerContext {
  rpc: RpcClient;
  keychain: KeychainClient;
  builder: CustomJsonBuilder;
  resolveAccount: (alias: string) => ResolvedAccount;
  // + internal lazy signing-account resolver
}`}
        />
      </DocSection>

      <DocSection id="token" title="Token inputs">
        <Prose>
          <p>
            <code>from</code> is always an <code>AccountReference</code> such as{" "}
            <code>hive.accounts.treasury</code> — never a raw alias string.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`interface TokenIssueInput extends IssuerOperationOptions {
  from: AccountReference;
  symbol: string;
  account: string;     // destination
  quantity: string;    // string, never a float
  memo?: string;
}

interface TokenTransferInput extends IssuerOperationOptions {
  from: AccountReference;
  symbol: string;
  account: string;
  quantity: string;
  memo?: string;
}

/** Burn = transfer to a burn destination. */
interface TokenBurnInput extends IssuerOperationOptions {
  from: AccountReference;
  symbol: string;
  quantity: string;
  account?: string;    // defaults to "null"
  memo?: string;
}

// Keychain variants (hive.keychainIssuer.token.*) drop \`from\` and take
// \`username\` through KeychainIssuerOptions instead.`}
        />
      </DocSection>

      <DocSection id="nft" title="NFT inputs">
        <CodeBlock
          language="typescript"
          code={`type NftAccountType = "user" | "contract";

interface NftLockNfts { symbol: string; ids: string[] }

interface NftIssueInput<P extends Record<string, unknown> = Record<string, unknown>>
  extends IssuerOperationOptions {
  from: AccountReference;
  symbol: string;
  account: string;                 // destination (or contract)
  feeSymbol: string;               // required by the nft contract
  accountType?: NftAccountType;    // default "user"
  fromType?: NftAccountType;
  properties?: P;
  lockTokens?: Record<string, string>;  // { "SCRAP": "5" }
  lockNfts?: NftLockNfts[];
}

/** One item inside issueMultiple. Same as NftIssueInput minus \`from\`/\`id\`. */
interface NftIssueInstance<P = Record<string, unknown>> {
  symbol: string;
  account: string;
  feeSymbol: string;
  accountType?: NftAccountType;
  fromType?: NftAccountType;
  properties?: P;
  lockTokens?: Record<string, string>;
  lockNfts?: NftLockNfts[];
}

interface NftIssueMultipleInput<P = Record<string, unknown>> extends IssuerOperationOptions {
  from: AccountReference;
  instances: Array<NftIssueInstance<P>>;   // max NFT_MAX_ISSUE_MULTIPLE_INSTANCES
}

interface NftTransferItem { symbol: string; ids: string[] }

interface NftTransferInput extends IssuerOperationOptions {
  from: AccountReference;
  account: string;
  accountType?: NftAccountType;
  fromType?: NftAccountType;
  nfts: NftTransferItem[];         // max NFT_MAX_TRANSFER_INSTANCES total ids
}

/** Burn = NFT transfer to a burn destination. Note: \`id\` is the NFT instance id. */
interface NftBurnInput {
  from: AccountReference;
  symbol: string;
  id: string | string[];           // one id or several of the same symbol
  account?: string;                // defaults to "null"
  accountType?: NftAccountType;
  fromType?: NftAccountType;
}

interface NftTransactionResult {
  success: boolean;
  transactionId?: string;
  action: string;                  // "issue" | "issueMultiple" | "transfer" | "burn"
  account?: string;
  raw: unknown;
}`}
        />
        <Callout tone="info" title="NftBurnInput has no custom_json id override">
          Because <code>id</code> means the NFT instance id here, the sidechain custom_json id is
          fixed to <code>ssc-mainnet-hive</code> for burns.
        </Callout>
      </DocSection>

      <DocSection id="engine" title="Hive Engine">
        <CodeBlock
          language="typescript"
          code={`/** A single sidechain smart-contract action, serialized into custom_json.json */
interface HiveEngineContractAction<P = Record<string, unknown>> {
  contractName: string;      // "tokens" | "nft" | ...
  contractAction: string;    // "transfer" | "issue" | "issueMultiple" | ...
  contractPayload: P;
}

type TokenContractActionName = "issue" | "transfer";          // TOKEN_ACTIONS
type NftContractActionName   = "issue" | "issueMultiple" | "transfer"; // NFT_ACTIONS

/** Inputs of the low-level TokenActionBuilder (no alias, no signing). */
interface TokenActionInput {
  symbol: string;
  account: string;
  quantity: string;
  memo?: string;
}
interface TokenBurnActionInput {
  symbol: string;
  quantity: string;
  account?: string;   // defaults to "null"
  memo?: string;
}`}
        />
      </DocSection>

      <DocSection id="config" title="Configuration">
        <Prose>
          <p>
            Configurations hold account aliases and metadata. They never hold resolved keys and
            never control RPC nodes — endpoint discovery is a separate system.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`/** One alias entry. Exactly one of account / accountEnv is required. */
interface HiveAccountConfig {
  account?: string;       // direct Hive account name
  accountEnv?: string;    // env var holding the account name
  key?: string;           // direct private key — backend only
  keyEnv?: string;        // env var holding the key — resolved lazily at signing time
  options?: Record<string, unknown>;
}

/** Developer-owned configuration. Only "accounts" is interpreted by the SDK. */
interface HiveConfig {
  accounts?: Record<string, HiveAccountConfig>;
  [key: string]: unknown;            // your own structure, stored verbatim
}

/** SDK runtime options — stripped out, never part of hive.configs. */
interface HiveRuntimeOptions {
  endpoint?: string;                 // RPC override
  beaconUrl?: string;
  environment?: EnvironmentResolver; // default reads process.env when present
}

type HiveClientOptions<TConfig extends HiveConfig = HiveConfig> =
  TConfig & HiveRuntimeOptions;

/** hive.configs — exactly the config you passed, frozen and typed. */
type HiveConfigs<TConfig extends HiveConfig> =
  Readonly<Omit<TConfig, keyof HiveRuntimeOptions>>;

/** Minimal shape accepted by low-level RPC-only clients. */
interface HiveClientConfig { endpoint?: string; beaconUrl?: string }

/** Public, key-free handle: hive.accounts.treasury */
interface AccountReference {
  readonly alias: string;
  readonly accountEnv?: string;  // env var NAME, never the value
  readonly keyEnv?: string;      // env var NAME, never the value
  readonly signing: boolean;     // declares a key or keyEnv
  readonly options?: Record<string, unknown>;
}

/** hive.resolveAccount(alias) — never contains a key. */
interface ResolvedAccount {
  alias: string;
  account: string;
  options?: Record<string, unknown>;
}
/** Internal signing credentials; never returned by public APIs. */
interface ResolvedSigningAccount extends ResolvedAccount { key: string }`}
        />
      </DocSection>

      <DocSection id="environment" title="Environment and keys">
        <CodeBlock
          language="typescript"
          code={`/** Runtime-independent env access. Inject your own for Deno, Workers, tests... */
interface EnvironmentResolver {
  get(name: string): string | undefined;
}
// helpers: defaultEnvironmentResolver, createEnvironmentResolver(record),
//          requireEnvValue(resolver, name), isPresentEnvValue(value)

/** Resolved from an alias at call time; the key is never stored. */
interface ResolvedSigningAccount {
  alias: string;
  account: string;
  key: string;   // read from the environment just-in-time
}`}
        />
      </DocSection>

      <DocSection id="transactions" title="Transactions">
        <CodeBlock
          language="typescript"
          code={`interface UnsignedTransaction {
  ref_block_num: number;
  ref_block_prefix: number;
  expiration: string;
  operations: unknown[];
  extensions: unknown[];
  [key: string]: unknown;
}

interface SignedTransaction extends UnsignedTransaction {
  signatures: string[];
}
// internal: the SDK serializes, hashes with the Hive chain id and signs
// with the resolved WIF key — no pluggable signing strategy exists.`}
        />
      </DocSection>

      <DocSection id="beacon" title="Beacon">
        <CodeBlock
          language="typescript"
          code={`/** Normalized node record from hive.beacon.getNodes() */
interface BeaconNode {
  name: string;
  endpoint: string;
  version: string;
  score: number;            // 0–100
  updatedAt: string;
  success: number;
  fail: number;
  lastBlock: number | null;
  features: string[];
  raw: BeaconNodeRaw;       // untouched API record
}

interface BeaconNodeRaw {
  name: string; endpoint: string; version: string; score: number;
  updated_at: string; success: number; fail: number;
  lastBlock: number | null; features?: string[];
  apps?: { success: number; fail: number };
  [key: string]: unknown;
}

interface BeaconFetchOptions {
  signal?: AbortSignal;
  minScore?: number;          // default 0
  requireFeatures?: string[]; // keep nodes exposing ALL listed features
  limit?: number;             // after sorting by score desc
}

const DEFAULT_BEACON_URL = "https://beacon.peakd.com/api/nodes";`}
        />
      </DocSection>

      <DocSection id="keychain" title="Keychain">
        <CodeBlock
          language="typescript"
          code={`/** hive.keychain.requestSignIn() — sign an app challenge for account ownership. */
interface KeychainSignInInput {
  username: string;
  message: string;
  authority?: HiveAuthority;   // default "posting"
}

interface KeychainSignInResult {
  success: true;
  username: string;
  message: string;
  authority: HiveAuthority;
  signature: string | null;
  signedAt: string;
  raw: unknown;
}

/** hive.keychain.requestTransfer() — native OR Layer 2, picked by currency. */
interface KeychainTransferInput {
  username: string;
  to: string;
  amount: string;        // "10.000"
  currency: string;      // "HIVE" | "HBD" -> native; any token symbol -> Hive Engine
  memo: string;
  enforce?: boolean;     // lock recipient (native only). Default true
}

/** hive.keychain.customJson() */
interface KeychainCustomJsonInput<T = Record<string, unknown>> {
  username: string;
  id: string;
  action: string;
  metadata?: T | null;
  authority?: HiveAuthority;   // default "posting"
  message?: string;            // popup text
}

/** hive.keychain.customJsonRaw() — body broadcast verbatim */
interface KeychainCustomJsonRawInput {
  username: string;
  id: string;
  json: string;
  authority?: HiveAuthority;
  message?: string;
}

/** hive.keychain.payments.hive.transfer() */
interface KeychainHivePaymentInput<T = Record<string, unknown>> {
  username: string;
  account: string;
  amount: string;
  symbol: string;        // "HIVE" | "HBD"
  action: string;
  metadata?: T | null;
  message?: string;
}
/** hive.keychain.payments.engine.transfer() */
interface KeychainEnginePaymentInput<T = Record<string, unknown>> {
  username: string;
  account: string;
  symbol: string;
  quantity: string;
  action: string;
  metadata?: T | null;
  message?: string;
}

/** hive.keychainIssuer.* — every op is signed by this browser account */
interface KeychainIssuerOptions {
  username: string;
  id?: string;           // sidechain custom_json id override
  message?: string;
}

/** Resolved value of every keychain.* call. Rejections THROW HiveSdkError. */
interface KeychainResult {
  success: true;
  transactionId: string | null;
  raw: unknown;
}

/** Raw extension callback shape, exposed as \`raw\`. */
interface KeychainResponse {
  success?: boolean;
  error?: unknown;
  message?: string;
  result?: unknown;
  data?: unknown;
  request_id?: number;
}`}
        />
      </DocSection>

      <DocSection id="errors" title="Errors">
        <Prose>
          <p>
            Every failure the SDK raises is a <code>HiveSdkError</code> with a stable{" "}
            <code>code</code>. Subclasses exist for configuration and NFT failures but always carry
            one of these codes.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`class HiveSdkError extends Error {
  readonly code: HiveSdkErrorCode;
  readonly raw: unknown;   // underlying response / cause, or null
}

type HiveSdkErrorCode =
  // input & transport
  | "VALIDATION_ERROR" | "HTTP_ERROR" | "RPC_ERROR" | "PARSE_ERROR" | "NOT_FOUND"
  // keychain
  | "KEYCHAIN_UNAVAILABLE" | "KEYCHAIN_REJECTED" | "KEYCHAIN_ERROR"
  // configuration & aliases
  | "CONFIG_NOT_FOUND" | "CONFIG_EXISTS" | "CONFIG_INVALID"
  | "ACCOUNT_ALIAS_NOT_FOUND" | "ACCOUNT_CONFIG_INVALID" | "ACCOUNT_RESOLUTION_ERROR"
  | "ENV_VAR_MISSING"
  // signing
  | "SIGNING_KEY_MISSING" | "SIGNING_ERROR" | "BROADCAST_ERROR"
  // nft
  | "NFT_VALIDATION_ERROR" | "NFT_SYMBOL_ERROR" | "NFT_TRANSFER_LIMIT_ERROR"
  | "NFT_ISSUANCE_ERROR" | "NFT_TRANSFER_ERROR" | "NFT_BURN_ERROR"
  | "NFT_ACCOUNT_RESOLUTION_ERROR";

// Subclasses (all extend HiveSdkError):
HiveConfigurationError | HiveAccountNotFoundError | HiveAccountResolutionError
HiveEnvironmentVariableMissingError | HiveSigningKeyMissingError | HiveSigningError
NftValidationError | NftSymbolError | NftTransferLimitError
NftIssuanceError | NftTransferError | NftAccountResolutionError

try {
  await hive.issuer.token.issue({ ... });
} catch (err) {
  if (err instanceof HiveSdkError && err.code === "ENV_VAR_MISSING") {
    // TREASURY_ACTIVE_KEY is not set on this machine
  }
}`}
        />
      </DocSection>

      <DocSection id="constants" title="Constants">
        <CodeBlock
          language="typescript"
          code={`DEFAULT_RPC_ENDPOINT              = "https://api.hive.blog"
DEFAULT_BEACON_URL                = "https://beacon.peakd.com/api/nodes"

HIVE_ENGINE_CUSTOM_JSON_ID        = "ssc-mainnet-hive"
HIVE_ENGINE_AUTHORITY             = "active"
TOKEN_CONTRACT                    = "tokens"
TOKEN_ACTIONS                     = { issue: "issue", transfer: "transfer" }
NFT_CONTRACT                      = "nft"
NFT_ACTIONS                       = { issue, issueMultiple, transfer }
NFT_MAX_TRANSFER_INSTANCES        // max ids per NFT transfer
NFT_MAX_ISSUE_MULTIPLE_INSTANCES  // max instances per issueMultiple

ENGINE_BLOCKCHAIN_RPC             = "https://api.hive-engine.com/rpc/blockchain"
ENGINE_CONTRACTS_RPC              = "https://api.hive-engine.com/rpc/contracts"
MAX_MEMO_BYTES                    = 2048
NATIVE_SYMBOLS                    = ["HIVE", "HBD"]
NATIVE_PRECISION                  = 3

// helpers
formatNativeAsset(amount, symbol) // "1" -> "1.000 HIVE"
parseNativeAsset("1.000 HIVE")    // { amount: "1.000", symbol: "HIVE" }
quantitiesEqual("1", "1.000")     // true
countNftInstances(nfts)           // total ids across NftTransferItem[]
isAccountReference(value) | isActionPayload(value) | assertActionName(name)`}
        />
      </DocSection>
    </DocPage>
  );
}
