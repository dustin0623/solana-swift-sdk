/**
 * Documentation information architecture.
 * Documentation pages and their matching playground consoles now live in one
 * combined tree: a section holds items, and an item may hold nested children
 * (a guide plus its interactive playground).
 * Drives the sidebar, previous/next footer navigation and local search.
 */

export interface NavItem {
  title: string;
  to: string;
  summary: string;
  /** Marks an interactive playground console rather than a reading page. */
  playground?: boolean;
}

export interface NavGroup {
  title: string;
  /** Nested entries shown when the group is expanded; groups may nest further. */
  items: NavEntry[];
}


export type NavEntry = NavItem | NavGroup;

export interface NavSection {
  title: string;
  items: NavEntry[];
}

export function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).items !== undefined;
}

export const docsNav: NavSection[] = [
  {
    title: "Getting started",
    items: [
      { title: "Introduction", to: "/docs", summary: "What the SDK does and how it is organized." },
      {
        title: "Installation",
        to: "/docs/installation",
        summary: "Install hivexph-sdk with npm, pnpm or yarn.",
      },
      {
        title: "Quick start",
        to: "/docs/quick-start",
        summary: "Three paths: standard Custom JSON, Hive Keychain and backend signing.",
      },
      {
        title: "Playground overview",
        to: "/docs/playground",
        summary: "The live consoles bundled with these docs.",
        playground: true,
      },
    ],
  },
  {
    title: "Core concepts",
    items: [
      {
        title: "Architecture",
        to: "/docs/architecture",
        summary: "HiveClient namespaces, shared builders and the transaction paths.",
      },
      {
        title: "Custom JSON",
        items: [
          {
            title: "Standard Custom JSON",
            to: "/docs/custom-json",
            summary: "The standardized { action, metadata } payload and CustomJsonBuilder.",
          },
          {
            title: "Try it: Custom JSON",
            to: "/docs/playground/custom-json",
            summary: "Build and broadcast { action, metadata } payloads with Keychain.",
            playground: true,
          },
          {
            title: "Raw Custom JSON",
            to: "/docs/raw-custom-json",
            summary: "Protocol-specific payloads that bypass the standardized envelope.",
          },
          {
            title: "Try it: Raw Custom JSON",
            to: "/docs/playground/raw-custom-json",
            summary: "Broadcast a protocol-specific JSON string with Keychain.",
            playground: true,
          },
        ],
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        title: "Basics",
        items: [
          {
            title: "Configuration",
            to: "/docs/configuration",
            summary: "hive.configs, developer-defined structure and account maps.",
          },
          {
            title: "Account aliases",
            to: "/docs/account-aliases",
            summary: "How an alias resolves to a real Hive account at call time.",
          },
          {
            title: "Environment variables",
            to: "/docs/environment-variables",
            summary: "accountEnv, keyEnv and the runtime-agnostic environment resolver.",
          },
          {
            title: "Try it: Configurations",
            to: "/docs/playground/configurations",
            summary: "Create configurations, account aliases and inspect resolution.",
            playground: true,
          },
        ],
      },
      {
        title: "RPC nodes",
        items: [
          {
            title: "RPC resolution",
            to: "/docs/rpc-resolution",
            summary: "Default endpoint, custom nodes and Beacon node discovery.",
          },
          {
            title: "Try it: RPC nodes",
            to: "/docs/playground/nodes",
            summary: "Switch between the default endpoint, Beacon nodes and a custom URL.",
            playground: true,
          },
        ],
      },
    ],
  },
  {
    title: "Transactions",
    items: [
      {
        title: "Backend transactions",
        to: "/docs/backend",
        summary: "Server-side signing with configurations, aliases and RPC broadcast.",
      },
      {
        title: "Hive Keychain",
        items: [
          {
            title: "Keychain guide",
            to: "/docs/keychain",
            summary: "Browser signing through the Hive Keychain extension.",
          },
          {
            title: "Try it: Keychain",
            to: "/docs/playground/keychain",
            summary:
              "Detection, sign-in, Custom JSON, native and Layer 2 transfers, token and NFT actions.",
            playground: true,
          },
        ],
      },
    ],
  },
  {
    title: "Hive Engine",
    items: [
      {
        title: "Overview",
        to: "/docs/hive-engine",
        summary: "contractName / contractAction / contractPayload and ssc-mainnet-hive.",
      },
      {
        title: "Tokens",
        items: [
          {
            title: "Token issuer overview",
            to: "/docs/token-issuer",
            summary: "How the tokens contract, aliases and Keychain signing fit together.",
          },
          {
            title: "Create",
            items: [
              {
                title: "Create a token",
                to: "/docs/tokens/create",
                summary: "Required name, symbol, precision and max supply, with BEE checks.",
              },
              {
                title: "Try it: create",
                to: "/docs/playground/token/create",
                summary: "Run token creation with the BEE balance and symbol preflight.",
                playground: true,
              },
            ],
          },
          {
            title: "Issue",
            items: [
              {
                title: "Issue tokens",
                to: "/docs/tokens/issue",
                summary: "Mint new supply of a token you own to any account.",
              },
              {
                title: "Try it: issue",
                to: "/docs/playground/token/issue",
                summary: "Build and broadcast a token issue action.",
                playground: true,
              },
            ],
          },
          {
            title: "Transfer",
            items: [
              {
                title: "Transfer tokens",
                to: "/docs/tokens/transfer",
                summary: "Move existing token balance between accounts.",
              },
              {
                title: "Try it: transfer",
                to: "/docs/playground/token/transfer",
                summary: "Build and broadcast a token transfer action.",
                playground: true,
              },
            ],
          },
          {
            title: "Burn",
            items: [
              {
                title: "Burn tokens",
                to: "/docs/tokens/burn",
                summary: "Send tokens to null or a custom burn destination.",
              },
              {
                title: "Try it: burn",
                to: "/docs/playground/token/burn",
                summary: "Build and broadcast a token burn action.",
                playground: true,
              },
            ],
          },
        ],
      },
      {
        title: "NFTs",
        items: [
          {
            title: "NFT issuer overview",
            to: "/docs/nft-issuer",
            summary: "How the nft contract, collections and instances fit together.",
          },
          {
            title: "Create",
            items: [
              {
                title: "Create a collection",
                to: "/docs/nfts/create",
                summary: "Required name and symbol, optional metadata, BEE checks.",
              },
              {
                title: "Try it: create",
                to: "/docs/playground/nft/create",
                summary: "Run collection creation with the BEE and symbol preflight.",
                playground: true,
              },
            ],
          },
          {
            title: "Issue",
            items: [
              {
                title: "Issue an NFT",
                to: "/docs/nfts/issue",
                summary: "Mint one instance with properties and a fee symbol.",
              },
              {
                title: "Try it: issue",
                to: "/docs/playground/nft/issue",
                summary: "Build and broadcast a single NFT issue action.",
                playground: true,
              },
            ],
          },
          {
            title: "Issue multiple",
            items: [
              {
                title: "Issue multiple NFTs",
                to: "/docs/nfts/issue-multiple",
                summary: "Mint a list of instances in one contract action.",
              },
              {
                title: "Try it: issue multiple",
                to: "/docs/playground/nft/issue-multiple",
                summary: "Build and broadcast a batched NFT issue action.",
                playground: true,
              },
            ],
          },
          {
            title: "Transfer",
            items: [
              {
                title: "Transfer NFTs",
                to: "/docs/nfts/transfer",
                summary: "Move instance ids to another account.",
              },
              {
                title: "Try it: transfer",
                to: "/docs/playground/nft/transfer",
                summary: "Build and broadcast an NFT transfer action.",
                playground: true,
              },
            ],
          },
          {
            title: "Burn",
            items: [
              {
                title: "Burn NFTs",
                to: "/docs/nfts/burn",
                summary: "Send instance ids to null or a custom destination.",
              },
              {
                title: "Try it: burn",
                to: "/docs/playground/nft/burn",
                summary: "Build and broadcast an NFT burn action.",
                playground: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        title: "Sending payments",
        items: [
          {
            title: "Payments & triggers",
            to: "/docs/payments",
            summary:
              "One standardized { action, metadata } trigger carried by HIVE, HBD and Hive Engine transfers.",
          },
          {
            title: "Native HIVE / HBD",
            items: [
              {
                title: "Native payments",
                to: "/docs/native-payments",
                summary: "HIVE and HBD transfers with triggers from backend aliases or Keychain.",
              },
              {
                title: "Try it: native payment",
                to: "/docs/playground/payments/native",
                summary: "Preview and broadcast a HIVE or HBD payment trigger.",
                playground: true,
              },
            ],
          },
          {
            title: "Hive Engine tokens",
            items: [
              {
                title: "Hive Engine payments",
                to: "/docs/engine-payments",
                summary: "Layer 2 token transfers with triggers and execution verification.",
              },
              {
                title: "Try it: Engine payment",
                to: "/docs/playground/payments/engine",
                summary: "Preview and broadcast a Hive Engine token payment trigger.",
                playground: true,
              },
            ],
          },
        ],
      },
      {
        title: "Verifying payments",
        items: [
          {
            title: "Payment validation",
            to: "/docs/payment-validation",
            summary:
              "Parse a transaction and verify execution plus expectations before delivering value.",
          },
          {
            title: "Payment stream",
            to: "/docs/payment-stream",
            summary: "Watch live payments with filters and Layer 2 execution checks.",
          },
          {
            title: "Try it: Payment monitor",
            to: "/docs/playground/payment-monitor",
            summary: "Validate a transaction id and watch live payments with filters.",
            playground: true,
          },
        ],
      },
    ],
  },

  {
    title: "Reading",
    items: [
      {
        title: "Transactions",
        items: [
          {
            title: "Transaction reader",
            to: "/docs/transaction-reader",
            summary: "Look up a transaction id and normalize its Custom JSON operations.",
          },
          {
            title: "Custom JSON parser",
            to: "/docs/custom-json-parser",
            summary: "Detect, validate and normalize custom_json operations.",
          },
          {
            title: "Try it: Reader",
            to: "/docs/playground/reader",
            summary: "Read a transaction id and inspect parsed Custom JSON.",
            playground: true,
          },
        ],
      },
      {
        title: "Streams",
        items: [
          {
            title: "Unified stream engine",
            to: "/docs/unified-stream",
            summary: "One block reader, many filters: Custom JSON and payment events.",
          },
          {
            title: "Block stream",
            to: "/docs/block-stream",
            summary: "hive.blocks.watch() and hive.customJson.watch(): the core stream iterators.",
          },
          {
            title: "Try it: Unified stream",
            to: "/docs/playground/unified-stream",
            summary: "Combine Custom JSON and payment filters on one connection.",
            playground: true,
          },
        ],
      },
    ],
  },
  {
    title: "RPC",
    items: [
      {
        title: "Raw RPC",
        items: [
          {
            title: "Raw RPC guide",
            to: "/docs/raw-rpc",
            summary: "Call any Hive JSON-RPC method through hive.rpc.call().",
          },
          {
            title: "Try it: Raw RPC",
            to: "/docs/playground/rpc",
            summary: "Send an arbitrary JSON-RPC method and inspect the response.",
            playground: true,
          },
        ],
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        title: "API reference",
        to: "/docs/api-reference",
        summary: "Every namespace, method, parameter and return value.",
      },
      { title: "Types", to: "/docs/types", summary: "Exported TypeScript types and interfaces." },
      {
        title: "Errors",
        to: "/docs/errors",
        summary: "Error codes, causes and handling patterns.",
      },
      {
        title: "Troubleshooting",
        to: "/docs/troubleshooting",
        summary: "Common failures and how to resolve them.",
      },
      {
        title: "Compatibility",
        to: "/docs/compatibility",
        summary: "Supported runtimes and Hive Keychain versions.",
      },
      {
        title: "Release notes",
        to: "/docs/release-notes",
        summary: "What changed in each release.",
      },
    ],
  },
];

/** Backwards-compatible alias: the playground shares the combined navigation. */
export const playgroundNav = docsNav;

/** Depth-first walk of the tree, yielding leaf pages in reading order. */
function flattenEntries(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => (isGroup(entry) ? flattenEntries(entry.items) : [entry]));
}

function flatten(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => flattenEntries(section.items));
}


/** Flat order used for previous/next navigation. */
export const docsOrder: NavItem[] = flatten(docsNav);

export function adjacentDocs(pathname: string): { previous: NavItem | null; next: NavItem | null } {
  const index = docsOrder.findIndex((item) => item.to === pathname);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: docsOrder[index - 1] ?? null,
    next: docsOrder[index + 1] ?? null,
  };
}

export interface SearchEntry extends NavItem {
  group: string;
  kind: "Documentation" | "Playground";
}

function collectSearch(entries: NavEntry[], trail: string): SearchEntry[] {
  return entries.flatMap((entry) =>
    isGroup(entry)
      ? collectSearch(entry.items, `${trail} · ${entry.title}`)
      : [
          {
            ...entry,
            group: trail,
            kind: (entry.playground ? "Playground" : "Documentation") as SearchEntry["kind"],
          },
        ],
  );
}

export const searchIndex: SearchEntry[] = docsNav.flatMap((section) =>
  collectSearch(section.items, section.title),
);

