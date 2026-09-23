export interface PlaygroundTool {
  id: string;
  title: string;
  summary: string;
  /** Related doc slug. */
  doc: string;
  /** Uses the live devnet/mainnet client. */
  live: boolean;
}

export const PLAYGROUND_TOOLS: PlaygroundTool[] = [
  { id: "rpc", title: "RPC calls", summary: "Call getSlot and getLatestBlockhash against public Solana RPC.", doc: "rpc", live: true },
  { id: "accounts", title: "Account lookup", summary: "Read an account's balance, owner and data size through the reader layer.", doc: "readers", live: true },
  { id: "transactions", title: "Transaction explorer", summary: "Fetch and parse a live transaction by signature, read-only.", doc: "transactions", live: true },
  { id: "payments", title: "Payments", summary: "Build, simulate and validate a SOL payment against a mock RPC.", doc: "payments", live: false },
  { id: "tokens", title: "Tokens", summary: "Inspect any SPL or Token-2022 mint: supply, decimals and metadata.", doc: "spl-tokens", live: true },
  { id: "trading", title: "Trading", summary: "Discovery to quote to build to simulate to execute, on fixture data and a mock RPC.", doc: "trading", live: false },
  { id: "pdas", title: "PDAs", summary: "Derive a program-derived address from seeds.", doc: "pdas", live: false },
];

export function findTool(id: string): PlaygroundTool | undefined {
  return PLAYGROUND_TOOLS.find((tool) => tool.id === id);
}

export function toolForDoc(slug: string): PlaygroundTool | undefined {
  return PLAYGROUND_TOOLS.find((tool) => tool.doc === slug);
}
