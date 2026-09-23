export interface DocSection {
  slug: string;
  title: string;
  group: "Getting started" | "Core Solana" | "Domain APIs" | "Signing & streaming" | "Providers" | "Reference";
  summary: string;
  blocks: Array<{ text?: string; code?: string; note?: string }>;
}

export const DOCS: DocSection[] = [
  {
    slug: "introduction",
    title: "Introduction",
    group: "Getting started",
    summary: "What SolanaXPH is and why it is RPC-first.",
    blocks: [
      { text: "SolanaXPH is a strict TypeScript SDK built on standard Solana JSON-RPC. It gives you readers, parsers, builders and domain APIs (payments, tokens, NFTs, programs) over accounts, instructions, versioned transactions, lookup tables and PDAs." },
      { text: "It follows the same layering philosophy as the HivexPH SDK — simple API, then readers, builders, parsers and events — but it shares no blockchain code with it. Hive and Solana stay technically independent." },
      { code: `Solana blockchain\n  -> Solana RPC\n  -> RpcClient (provider-agnostic)\n  -> Reader / Builder / Parser\n  -> Payments / Tokens / Programs\n  -> Your application` },
      { note: "Helius, QuickNode, Alchemy or your own node are providers that plug into the RPC layer. None of them is required." },
    ],
  },
  {
    slug: "installation",
    title: "Installation",
    group: "Getting started",
    summary: "Install the package.",
    blocks: [
      { code: `npm install solanaxph-sdk\n# or\nbun add solanaxph-sdk` },
      { text: "The only runtime dependencies are @noble/curves (ed25519) and @noble/hashes (sha256) — audited cryptography rather than hand-rolled primitives. The package ships ESM, CJS and type declarations." },
    ],
  },
  {
    slug: "quick-start",
    title: "Quick Start",
    group: "Getting started",
    summary: "Read a balance and parse a transaction.",
    blocks: [
      { code: `import { SolanaClient, lamportsToSol } from "solanaxph-sdk";\n\nconst solana = new SolanaClient({ network: "devnet" });\n\nconst balance = await solana.reader.balance("<address>");\nconsole.log(lamportsToSol(balance.lamports), "SOL");\n\nconst tx = await solana.reader.transaction("<signature>");\nconsole.log(tx?.success, tx?.fee, tx?.transfers);` },
      { text: "No API key is needed: the default endpoints are Solana's public RPC." },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture",
    group: "Getting started",
    summary: "How the layers fit together.",
    blocks: [
      { text: "SolanaClient wires one RpcClient into every module. Modules never talk to a vendor directly." },
      { code: `solana.rpc       // typed RPC + raw request()\nsolana.reader    // balance, account, transaction, block, slot\nsolana.parser    // parse raw getTransaction payloads offline\nsolana.builder   // instructions -> transaction -> simulate -> send\nsolana.payments  // sol, spl, validate\nsolana.tokens    // mints, balances, transfer, mint, burn\nsolana.nft       // inspect + transfer NFT tokens\nsolana.programs  // PDAs, program accounts, custom instructions\nsolana.wallet    // signer factories\nsolana.blocks    // block reader shortcut\nsolana.stream    // websocket StreamEngine` },
    ],
  },
  {
    slug: "rpc",
    title: "RPC",
    group: "Core Solana",
    summary: "Typed RPC methods and the raw escape hatch.",
    blocks: [
      { code: `const { value } = await solana.rpc.getBalance(address);\nconst slot = await solana.rpc.getSlot({ commitment: "finalized" });\n\n// Any method, typed by you:\nconst version = await solana.rpc.request<{ "solana-core": string }>("getVersion", []);` },
      { text: "Read methods (getBalance, getAccountInfo, getTransaction…) are retried on transport failures. sendTransaction is never retried automatically, so a flaky network can never create a duplicate broadcast." },
      { text: "Errors are typed: RpcError (node returned an error), RpcHttpError (transport), ProviderError, ConfigurationError. They are thrown, never swallowed." },
    ],
  },
  {
    slug: "networks",
    title: "Networks",
    group: "Core Solana",
    summary: "mainnet, devnet, testnet, localnet and custom URLs.",
    blocks: [
      { code: `new SolanaClient({ network: "devnet" });\nnew SolanaClient({ network: "mainnet", rpc: { url: process.env.SOLANA_RPC_URL } });\nnew SolanaClient({ network: "localnet" }); // http://127.0.0.1:8899` },
      { text: "Commitment is explicit: set defaultCommitment (\"processed\" | \"confirmed\" | \"finalized\", default \"confirmed\") and override per call where correctness depends on it." },
    ],
  },
  {
    slug: "readers",
    title: "Readers",
    group: "Core Solana",
    summary: "Developer-facing reads with raw data attached.",
    blocks: [
      { code: `await solana.reader.balance(address);        // { lamports: bigint, ... }\nawait solana.reader.account(address);        // lamports, owner, data, parsed, raw\nawait solana.reader.signatures(address, { limit: 20 });\nawait solana.reader.transactionsOf(address, { limit: 10 });\nawait solana.reader.block(slot);\nawait solana.reader.slot({ commitment: "finalized" });` },
      { text: "Every normalized result keeps a raw field with the untouched RPC response." },
    ],
  },
  {
    slug: "transactions",
    title: "Transactions",
    group: "Core Solana",
    summary: "Legacy + v0 transactions, lookup tables, parsing.",
    blocks: [
      { code: `const tx = await solana.reader.transaction(signature, { commitment: "finalized" });\n\ntx.success; tx.error; tx.fee; tx.slot; tx.blockTime; tx.version;\ntx.accountKeys;     // lookup-table addresses already resolved\ntx.transfers;       // SOL transfers (incl. inner instructions)\ntx.tokenTransfers;  // SPL transfers\ntx.instructions;    // top-level + inner, with program ids\ntx.programs; tx.logs;\ntx.raw;             // untouched getTransaction response` },
      { text: "Already have a raw payload? Parse it offline:" },
      { code: `const parsed = solana.parser.transaction(signature, rawResponse);\nsolana.parser.usesLookupTables(rawResponse);` },
      { note: "The parser only reports transfers it can prove from System/Token instructions and balance data. Arbitrary program behaviour is preserved as raw instructions and logs rather than guessed." },
    ],
  },
  {
    slug: "payments",
    title: "Payments",
    group: "Domain APIs",
    summary: "Build SOL/SPL payments and verify them on-chain.",
    blocks: [
      { code: `// Returns an unsent TransactionBuilder — nothing is broadcast yet.\nconst builder = solana.payments.sol.transfer({ from, to, amount: "0.1" });\nconst sim = await builder.simulate();\n\nconst spl = await solana.payments.spl.transfer({ mint, from, to, amount: "10" });` },
      { text: "Verify a payment against the chain — a signature alone is not proof:" },
      { code: `const result = await solana.payments.validate({\n  signature,\n  expected: { to, from, amount: "10", mint },\n  commitment: "finalized",\n});\nif (!result.valid) console.log(result.reasons);` },
      { text: "The validator re-fetches the transaction and checks success, recipient, sender, mint, exact base-unit amount and the confirmation level you asked for. Amounts are decimal strings or bigint, never floats." },
    ],
  },
  {
    slug: "spl-tokens",
    title: "SPL Tokens",
    group: "Domain APIs",
    summary: "Mints, balances, transfers, mint and burn.",
    blocks: [
      { code: `const info = await solana.tokens.getMint(mint);            // decimals, supply, programId\nconst bal = await solana.tokens.getBalance(owner, mint);     // amount, decimals, uiAmount\nconst ata = await solana.tokens.associatedAddress(owner, mint);\n\nconst transfer = await solana.tokens.transfer({ mint, owner, to, amount: "2.5" });\nconst minting = await solana.tokens.mint({ mint, to, authority, amount: "100" });\nconst burning = await solana.tokens.burn({ mint, owner, amount: "1" });` },
      { text: "Decimals are always read from the mint. Token-2022 mints are detected by owner program and the Token-2022 program id is used for their instructions; Token-2022 extensions are not interpreted yet and are exposed through raw data." },
    ],
  },
  {
    slug: "token-infrastructure",
    title: "Token Infrastructure",
    group: "Domain APIs",
    summary: "Read any SPL or Token-2022 token, wherever it was created.",
    blocks: [
      { text: "The token layer works with arbitrary tokens on Solana — from any launchpad, DEX or custom program. It reads standard RPC state and never assumes a token came from SolanaXPH." },
      { code: `// Mint facts + which program owns it
const token = await sdk.tokens.get(mint);
token.mint.decimals; token.mint.supply.ui;
token.mint.program; // "spl-token" | "spl-token-2022"

// Exact balance across every token account the wallet holds
const bal = await sdk.tokens.balance({ owner, mint });
bal.amount.raw; bal.amount.ui; bal.accounts;

// Native SOL (never confused with an SPL mint)
const sol = await sdk.tokens.balance({ owner, mint: NATIVE_SOL });

// All token accounts of a wallet, SPL Token and Token-2022
const accounts = await sdk.tokens.accounts({ owner, nonZero: true });

const supply = await sdk.tokens.supply(mint);` },
      { text: "Metadata separates on-chain facts from off-chain claims. On-chain metadata comes from the Metaplex metadata account (or the Token-2022 metadata extension). Off-chain JSON is only fetched when you opt in, and is validated: bad JSON, unreachable hosts and non-web links are reported, never thrown." },
      { code: `const meta = await sdk.tokens.metadata(mint, { offChain: true });
meta.onChain;  // name, symbol, uri, creators — what the chain stores
meta.offChain; // { status: "ok" | "skipped" | "unavailable" | "invalid", image, ... }
meta.warnings; // non-fatal problems` },
      { note: "Wrapped SOL is a normal SPL mint (So111…11112). Use NATIVE_SOL for native SOL balances — \"SOL\" is not a valid address, so the two can never be mixed up." },
      { text: "Token-2022 extensions are reported exactly as the node decodes them; the SDK does not interpret transfer fees or other rules yet, and says so rather than pretending." },
    ],
  },
  {
    slug: "token-discovery",
    title: "Token Discovery",
    group: "Domain APIs",
    summary: "Searching and listing arbitrary tokens through pluggable providers.",
    blocks: [
      { text: "Token data answers \"tell me about this mint\". Discovery answers \"which tokens should I show?\". They are separate concerns, so discovery lives behind its own provider interface and never assumes a token came from SolanaXPH." },
      { code: `const page = await sdk.tokens.search("bonk");
page.items[0];      // normalized DiscoveredToken
page.items[0].source; // { provider, origin: "on-chain" | "indexed" }` },
      { text: "Every SolanaXPH client ships with the on-chain provider (\"rpc\"). It can resolve any mint address without an indexer, but it cannot search by symbol or name and cannot rank tokens — no such index exists on chain, so it reports those capabilities as false instead of faking them." },
      { code: `import { StaticTokenListProvider } from "solanaxph-sdk";

sdk.tokens.discovery.register(
  new StaticTokenListProvider({
    name: "my-indexer",
    attribution: "my market API",
    entries: [{ mint, symbol: "BONK", decimals: 5, market: { currency: "USD", volume24h: 5e6 } }],
  }),
  { default: true },
);` },
      { text: "Write your own provider by implementing TokenDiscoveryProvider — name, capabilities, sorts, search(), list(), get(). Provider-specific types never leak through the core API; results are normalized into DiscoveredToken." },
      { code: `sdk.tokens.discovery.capabilities();  // { search, trending, volume, liquidity, price, ... }
sdk.tokens.discovery.sorts();         // only modes the active provider can serve
sdk.tokens.discovery.supports("trending");` },
      { text: "Listing uses the sort modes the active provider actually supports: new, trending, volume, liquidity or recent. Asking for an unsupported mode throws UnsupportedOperationError rather than returning invented numbers." },
      { code: `await sdk.tokens.list({ sort: "new", limit: 20 });

// Cursor pagination — cursors are opaque and provider-specific
let cursor = null;
do {
  const page = await sdk.tokens.list({ sort: "volume", limit: 50, cursor });
  cursor = page.nextCursor;
} while (cursor);

// Or iterate every page
for await (const items of sdk.tokens.discovery.paginate("list", { sort: "volume" })) { /* … */ }` },
      { note: "On-chain vs indexed: mint, decimals and program can be verified on chain. Price, volume, liquidity, market cap, createdAt and verification status always come from a third party — they are grouped under `market` and labelled `origin: \"indexed\"`, and the SDK never presents them as authoritative." },
      { text: "Mint lookup is always available: sdk.tokens.discovery.get(mint) falls back to the on-chain provider even when an indexer is the default, so a failing API can never hide a real token." },
    ],
  },
  {
    slug: "swap-quotes",
    title: "Swap Quotes",
    group: "Domain APIs",
    summary: "Quote-only swap engine: expected output, minimum received, fees and price impact.",
    blocks: [
      { text: "sdk.swap.quote() prices a potential swap. It never signs, broadcasts, modifies accounts or executes anything. Amounts are bigint base units (lamports for SOL); all math is exact integer arithmetic." },
      { code: `const quote = await sdk.swap.quote({
  input: "SOL",            // or "USDC", or any mint address
  output: tokenMint,
  amount: 1_000_000_000n,  // 1 SOL in lamports
  slippageBps: 100,        // 1% tolerance
});

quote.outAmount;       // expected output (base units)
quote.minOutAmount;    // outAmount minus slippage, rounded down
quote.priceImpactBps;  // curve impact, fees excluded
quote.fees;            // [{ amount, mint, bps, pool }]
quote.route;           // single hop: pool, dex, amounts, fee
sdk.swap.assertFresh(quote); // throws once expiresAt has passed` },
      { text: "Four distinct numbers: spotPrice is the pool ratio before your trade; executionPrice is outAmount/inAmount for your size; priceImpactBps is how much your trade moves the curve (independent of fees); slippageBps is only your tolerance for state changing before execution, used to compute minOutAmount. 100 bps = 1%. slippageBps must be an integer and is capped at 1000 by default." },
      { text: "Fees are charged on the input and rounded up in the pool's favour; output is rounded down, so quotes never overstate what you receive. Routes are direct single-pool only. The built-in PoolQuoteProvider uses pools from sdk.pools that report raw reserves and a fee, and only constant-product types (amm, cpmm) — concentrated-liquidity and stable pools are skipped rather than misquoted. Register your own SwapQuoteProvider to add other sources; it must return the normalized SwapQuote." },
    ],
  },
  {
    slug: "swap-transactions",
    title: "Swap Transactions",
    group: "Domain APIs",
    summary: "Turning a quote into an unsigned transaction. The SDK never signs or broadcasts.",
    blocks: [
      { code: `const quote = await sdk.swap.quote({ input: "SOL", output: tokenMint, amount: 1_000_000_000n, slippageBps: 100 });
const result = await sdk.swap.build({ quote, owner: walletAddress });

result.transaction;      // UNSIGNED — sign with your wallet, then send yourself
result.instructions;     // compute budget, ATA creation, wrap/unwrap, swap
result.requiredSigners;  // addresses that must sign
result.estimatedFees;    // network, priority, rent, wrapped SOL, totalSolRequired
result.accounts;         // source, destination, recipient, created ATAs
result.warnings;` },
      { text: "Before building, the SDK checks the quote has not expired or been tampered with, the amount and mints, that the source account exists and holds enough, that the owner has enough SOL for fees, rent and wrapping, and re-quotes the pool to confirm the minimum output is still achievable." },
      { text: "Missing output token accounts are detected and an idempotent create instruction is added, with its rent counted in estimatedFees. SOL input is wrapped into a temporary wSOL account that is closed afterwards; SOL output is unwrapped only when the SDK created the account, so pre-existing wSOL is never touched." },
      { text: "Slippage protection is mandatory: the quote's minOutAmount is passed to the provider and must be encoded on-chain. Providers that cannot enforce a minimum output are refused. The recipient defaults to the owner and is never changed silently. A transaction that builds can still fail on-chain." },
      { text: "Building needs a SwapProvider — a quote provider that also implements buildSwapInstructions() and declares enforcesMinOut. The built-in pool quote provider is quote-only, so register a protocol provider for your DEX before calling build()." },
    ],
  },
  {
    slug: "swap-execution",
    title: "Swap Execution",
    group: "Domain APIs",
    summary: "The full lifecycle: quote, build, simulate, sign, send, confirm — only when you ask.",
    blocks: [
      { code: `const quote = await sdk.swap.quote({ input: "SOL", output: tokenMint, amount: 1_000_000_000n, slippageBps: 100 });
const tx = await sdk.swap.build({ quote, owner: wallet.address });   // unsigned

// Inspect before anything is signed
tx.instructions; tx.requiredSigners; tx.estimatedFees; tx.accounts.recipient;

const simulation = await sdk.swap.simulate(tx);   // never signs or broadcasts
simulation.success; simulation.logs; simulation.unitsConsumed; simulation.error;

const result = await sdk.swap.execute(tx, {
  signers: [wallet],          // any SolanaSigner: wallet adapter, hardware, keypair
  commitment: "confirmed",    // processed | confirmed | finalized
});
result.signature; result.confirmationStatus; result.slot;` },
      { text: "execute() is the only swap method that signs or sends. It checks the quote is still fresh, that the signers exactly match the transaction's required signers, simulates (on by default), signs the exact message you inspected, broadcasts once (never auto-retried), then waits for the requested commitment." },
      { text: "Signing goes through the SolanaSigner interface, so external wallets work and the core SDK never needs a private key. Signer errors are reported by signer address only; their messages are not copied, so no key or seed phrase can leak into logs." },
      { code: `try {
  await sdk.swap.execute(tx, { signers: [wallet] });
} catch (e) {
  if (e instanceof SwapExecutionError) {
    e.reason;    // simulation_failed | insufficient_funds | blockhash_expired | slippage_exceeded
                 // rejected | rpc_error | timeout | confirmation_failed | signer_mismatch
                 // signing_failed | quote_expired
    e.stage;     // validate | simulate | sign | send | confirm
    e.signature; // set once the transaction was sent
    e.logs;      // program logs when available
    e.cause;     // the untouched Solana / RPC error
  }
}` },
      { text: "A timeout means the transaction was not observed in time — it may still land. Check the signature before sending again. A blockhash_expired failure during confirmation means it can never land, so it is safe to rebuild from a fresh quote." },
    ],
  },
  {
    slug: "trading",
    title: "Token Trading Flow",
    group: "Domain APIs",
    summary: "Discovery, token details, pools, quote, build, simulate and execute as one flow with full provenance.",
    blocks: [
      { code: `// 1. Discovery — only categories the provider supports
sdk.trading.categories();                         // e.g. ["search", "new", "recent", "volume"]
const fresh = await sdk.trading.discover("new", { limit: 20 });
const hits  = await sdk.trading.discover("search", { query: "bonk" });
// "trending" throws UnsupportedOperationError unless the provider ranks by it

// 2. Token details — tokens.get + tokens.metadata + discovery + pools.find
const view = await sdk.trading.view(mint);
view.name;      // { value, source: { origin: "on-chain-metadata" | "off-chain-metadata" | "discovery", provider } }
view.decimals;  // always from the mint account
view.market;    // indexed price / volume / liquidity + its discovery source, or null
view.pools;     // [{ address, dex, programId, pair, liquidityUsd, price, feeBps, provider }]
view.routes;    // pairs the token trades against

// 3. Buy / sell
const buy  = await sdk.trading.quoteBuy({ mint, amount: 1_000_000_000n, slippageBps: 100 });       // SOL -> token
const sell = await sdk.trading.quoteSell({ mint, receive: "USDC", amount: 5_000_000n });          // token -> USDC
// both are sdk.swap.quote(...) — use it directly for any pair

// 4. Build, simulate, execute (unchanged Phase 5/6 APIs)
const tx = await sdk.swap.build({ quote: buy, owner: wallet.address });
await sdk.swap.simulate(tx);
await sdk.swap.execute(tx, { signers: [wallet] });

// 5. Transparency
const trace = await sdk.trading.trace(tx);
trace.swapProvider;   // who quoted
trace.hops;           // pool, dex, poolProgramId, poolProvider per hop
trace.swapPrograms;   // DEX programs the transaction actually invokes` },
      { text: "sdk.trading is a thin integration layer: it calls the existing token, discovery, pool and swap clients and never fetches data of its own. Only the mint read is required for view(); failed metadata, discovery or pool lookups become warnings instead of invented values." },
      { text: "Market figures are always third-party data and are shown with the discovery provider that supplied them. Rankings are never synthesized — a provider that cannot rank by a category makes that category unavailable." },
    ],
  },
  {
    slug: "pool-discovery",
    title: "Pool & Liquidity Discovery",
    group: "Domain APIs",
    summary: "Finding the venues where a token can actually trade.",
    blocks: [
      { text: "Token discovery is not pool discovery. Token discovery answers \"which tokens exist?\"; pool discovery answers \"where, if anywhere, can this token trade?\". A token can exist perfectly well with no usable pool at all, so an empty result means no registered provider knows of a pool — not that the token is fake." },
      { code: `const page = await sdk.pools.find({ token: mint });        // any pair
await sdk.pools.find({ token: mint, pairedWith: SOL_MINT }); // token ↔ SOL
await sdk.pools.find({ token: mint, pairedWith: USDC_MINT }); // token ↔ USDC
await sdk.pools.find({ token: mint, dex: "raydium" });       // one protocol

const pool = await sdk.pools.get(poolAddress);               // normalized details` },
      { text: "Pools live behind a provider interface — name, dex, capabilities, findPools(), getPool() — so Raydium, Orca, Meteora, other AMMs, an indexer or your own custom venues all plug into the same API. No DEX provider is registered by default: SolanaXPH ships only the generic layer and StaticPoolProvider for curated lists, cached snapshots and tests, rather than shipping guessed protocol decoders." },
      { code: `import { StaticPoolProvider } from "solanaxph-sdk";

sdk.pools.register(new StaticPoolProvider({
  name: "my-indexer",
  attribution: "my pool API",
  pools: [{ address, dex: "raydium", tokenA: { mint, symbol: "BONK", decimals: 5 }, tokenB: { mint: SOL_MINT, decimals: 9 }, liquidityUsd: 250000, feeBps: 25 }],
}));

sdk.pools.capabilities();        // union across registered providers
sdk.pools.supports("reserves");  // false when nobody can supply them` },
      { note: "Liquidity is reported in four distinct forms and never collapsed into one number: raw reserves (base units as reported), indexedUsd (third-party figure), tvlUsd (third-party figure) and estimatedUsd (derived by calculation). Each carries origin: \"on-chain\", \"indexed\" or \"derived\", so an estimate is never presented as an on-chain fact." },
      { text: "Every field a provider does not supply stays null — reserves, price, fee, programId and creation info are never invented. sdk.pools.verify(pool) checks the pool address against chain state and reports whether the account exists and whether its owning program matches what the provider claimed." },
      { code: `const ranked = sdk.pools.rank(page.items, {
  prefer: ["raydium"],
  minLiquidityUsd: 10_000,
  amountUsd: 500,           // price-impact heuristic, never a quote
});
ranked[0].score;      // 0..1, comparable within one ranking call
ranked[0].confidence; // share of the weighting backed by real data
ranked[0].factors;    // liquidity / volume / fee / priceImpact / preference

await sdk.pools.best(mint); // find + rank in one call` },
      { note: "Ranking is venue-selection groundwork, not routing. The SDK does not quote, split, hop, buy, sell or execute anything." },
    ],
  },
  {
    slug: "nfts",
    title: "NFTs",
    group: "Domain APIs",
    summary: "Minimal NFT primitives.",
    blocks: [
      { code: `await solana.nft.isNft(mint);        // supply 1, decimals 0\nawait solana.nft.ownedBy(owner);\nconst builder = await solana.nft.transfer({ mint, from, to });` },
      { text: "Metadata standards (Metaplex, compressed NFTs) are intentionally out of the core. The Helius provider offers getAsset for enriched metadata." },
    ],
  },
  {
    slug: "programs",
    title: "Programs",
    group: "Domain APIs",
    summary: "Generic program utilities.",
    blocks: [
      { code: `await solana.programs.isProgram(programId);\nawait solana.programs.accountsOf(programId);\n\nconst ix = solana.programs.instruction({\n  programId,\n  keys: [{ address: account, isSigner: false, isWritable: true }],\n  data: new Uint8Array([1, 2, 3]),\n});\nconst builder = solana.builder.add(ix);` },
    ],
  },
  {
    slug: "pdas",
    title: "PDAs",
    group: "Domain APIs",
    summary: "Deterministic program-derived addresses.",
    blocks: [
      { code: `import { findProgramAddress } from "solanaxph-sdk";\n\nconst pda = findProgramAddress(["vault", ownerBytes], programId);\npda.address; pda.bump;\n\n// Same thing via the client\nsolana.programs.pda(["vault"], programId);` },
      { text: "Derivation walks bumps 255→0 and rejects on-curve results, exactly like the runtime. There is no shortcut that accepts an arbitrary bump." },
    ],
  },
  {
    slug: "wallets",
    title: "Wallets",
    group: "Signing & streaming",
    summary: "Server keypairs vs browser wallets.",
    blocks: [
      { code: `// Server only — load the secret yourself, never ship it to a browser.\nconst signer = solana.wallet.keypair(secretKeyBytes);\n\n// Browser — the wallet UI approves every signature.\nconst adapter = solana.wallet.fromBrowserWallet(window.solana, (msg) => wallet.signMessage(msg));` },
      { note: "KeypairSigner.toString() and toJSON() only reveal the public address." },
    ],
  },
  {
    slug: "signing",
    title: "Signing",
    group: "Signing & streaming",
    summary: "Instruction → transaction → signed → signature → confirmation.",
    blocks: [
      { code: `const builder = solana.builder.transfer({ from: signer.address, to, amount: "0.01" })\n  .feePayer(signer.address);\n\nconst built = await builder.build();           // unsigned transaction\nconst sim = await solana.builder.simulate(built); // no broadcast\n\n// Explicit send, broadcast exactly once, then confirm:\nconst { signature, status } = await builder.signWith(signer).sendAndConfirm({ commitment: "confirmed" });` },
      { text: "Building never signs or sends. Failed simulations can be turned into SimulationError with assertSimulationSucceeded(result), which carries logs and units consumed." },
    ],
  },
  {
    slug: "streaming",
    title: "Streaming",
    group: "Signing & streaming",
    summary: "One coordinated websocket StreamEngine.",
    blocks: [
      { code: `const sub = await solana.stream.account(address, (e) => console.log(e.lamports));\nawait solana.stream.logs({ mentions: [programId] }, (e) => console.log(e.signature));\nawait solana.stream.signature(signature, (e) => console.log(e.err));\nawait solana.stream.slots((e) => console.log(e.slot));\n\nawait sub.unsubscribe();\nawait solana.stream.close();` },
      { text: "All subscriptions share one socket that reconnects and re-subscribes. Log events are de-duplicated per signature. Websockets can miss events across a disconnect, so reconcile over RPC:" },
      { code: `const missed = await solana.stream.reconcile(address, { since: lastSignature });` },
    ],
  },
  {
    slug: "helius",
    title: "Helius Provider",
    group: "Providers",
    summary: "Optional, isolated provider extension.",
    blocks: [
      { text: "Helius is just an RPC URL. This works without any Helius code at all:" },
      { code: `new SolanaClient({ rpc: { url: process.env.HELIUS_RPC_URL } });` },
      { text: "For Helius-only APIs, opt in through the separate entry point:" },
      { code: `import { HeliusRpcProvider } from "solanaxph-sdk/helius";\n\nconst helius = new HeliusRpcProvider({ url: process.env.HELIUS_RPC_URL! });\nconst solana = new SolanaClient({ provider: helius });\nawait helius.getAsset(mint);\nawait helius.getAssetsByOwner(owner, { limit: 50 });` },
      { note: "Keep Helius URLs with API keys on the server. Core APIs stay identical across providers." },
    ],
  },
  {
    slug: "api-reference",
    title: "API Reference",
    group: "Reference",
    summary: "Main exports.",
    blocks: [
      { code: `SolanaClient, SolanaClientOptions\nRpcClient, HttpRpcProvider, WebSocketRpcProvider, MockRpcProvider\nReaderClient, AccountReader, BalanceReader, TransactionReader, BlockReader, SlotReader\nStreamEngine\nParserClient, TransactionParser, InstructionParser, TransferParser, TokenTransferParser, LogParser\nBuilderClient, TransactionBuilder, InstructionBuilder, simulateBuilt, assertSimulationSucceeded, confirmSignature\nPaymentClient, SolPaymentClient, SplPaymentClient, PaymentValidator\nTokenClient, MintClient, TransferClient, NftClient, ProgramClient\nKeypairSigner, WalletAdapter, WalletClient, type SolanaSigner\nfindProgramAddress, derivePda, createProgramAddress\nsolToLamports, lamportsToSol, toBaseUnits, fromBaseUnits, base58Encode, base58Decode\nRpcError, RpcHttpError, TransactionError, SimulationError, ValidationError,\nConfigurationError, ProviderError, SubscriptionError, UnsupportedOperationError\n\n// separate entry\nimport { HeliusRpcProvider } from "solanaxph-sdk/helius";` },
    ],
  },
  {
    slug: "examples",
    title: "Examples",
    group: "Reference",
    summary: "Testing with MockRpcProvider.",
    blocks: [
      { code: `import { SolanaClient, MockRpcProvider } from "solanaxph-sdk";\n\nconst solana = new SolanaClient({\n  provider: new MockRpcProvider({ getBalance: { context: { slot: 1 }, value: 42 } }),\n});\nawait solana.reader.balance(address); // { lamports: 42n, ... }` },
      { text: "Try the interactive examples in the Playground — including a live devnet transaction explorer." },
    ],
  },
  {
    slug: "security",
    title: "Security",
    group: "Reference",
    summary: "Rules the SDK enforces.",
    blocks: [
      { text: "Nothing is signed or broadcast without an explicit call. sendTransaction is never retried blindly. Amounts use bigint and decimal strings. Signers never print secret keys. Helius/QuickNode URLs with keys belong on the server; public RPC URLs are safe in the browser." },
      { code: `# frontend-safe\nVITE_SOLANA_RPC_URL=https://api.devnet.solana.com\n# server-only\nHELIUS_RPC_URL=...\nPAYER_SECRET_KEY=...` },
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    group: "Reference",
    summary: "Common questions.",
    blocks: [
      { text: "Do I need Helius? No. Any Solana RPC works." },
      { text: "Does it support versioned transactions? Yes — v0 is the builder default and lookup tables are resolved when reading." },
      { text: "Is Token-2022 supported? Mints owned by Token-2022 are recognised and use the right program id; extensions are not interpreted yet." },
      { text: "Can I use it in the browser? Yes for reads, simulation and wallet-approved signing. Keep secret keys on the server." },
    ],
  },
];

export function findDoc(slug: string): DocSection | undefined {
  return DOCS.find((d) => d.slug === slug);
}
