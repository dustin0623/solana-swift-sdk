# SolanaXPH SDK — roadmap

- [x] Clone HivexPH reference into /ref (no nested .git)
- [x] Phase 1 Foundation: package, errors, utils, networks, RPC provider + client
- [x] Phase 2 Reading: account/balance/slot/block/transaction readers + parser
- [x] Phase 3 Transactions: instruction + transaction builder, simulate, sign, send, confirm
- [x] Phase 4 Payments: SOL + SPL transfer, validation
- [x] Phase 5 Streaming: WebSocket provider + StreamEngine
- [x] Phase 6 Tokens / NFT / Programs / PDA
- [x] Phase 7 Helius provider (optional, isolated)
- [x] Phase 8 Documentation website
- [x] Phase 9 Playground (read-only / devnet)
- [x] Tests with MockRpcProvider + fixtures
- [x] Root README, .env.example, final git/ref verification
- [x] Phase 1 (tokens): token reader, metadata, discovery, tests (62 passing), docs + playground
- [x] Phase 2 (token discovery): provider abstraction, rpc + static providers, cursor pagination, capabilities, tests (85 passing), docs
- [x] Phase 3 (pool discovery): PoolProvider abstraction, normalized LiquidityPool, find/get/rank/verify, static provider, tests (118 passing), docs
- [x] Phase 4: quote engine (sdk.swap.quote, quote-only, no execution)
- [x] Phase 5: swap transaction builder (sdk.swap.build, unsigned only)
- [x] Phase 6: swap execution (sdk.swap.simulate / execute, explicit signers)
