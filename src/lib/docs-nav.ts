import { DOCS, findDoc } from "./docs";
import { findTool } from "./playground-tools";

export interface NavItem {
  title: string;
  to: string;
  playground?: boolean;
}
export interface NavGroup {
  title: string;
  items: NavEntry[];
}
export type NavEntry = NavItem | NavGroup;
export interface NavSection {
  title: string;
  items: NavEntry[];
}

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

function doc(slug: string, title?: string): NavItem {
  const d = findDoc(slug);
  if (!d) throw new Error(`Unknown doc ${slug}`);
  return { title: title ?? d.title, to: `/docs/${slug}` };
}
function tryIt(id: string): NavItem {
  const t = findTool(id);
  if (!t) throw new Error(`Unknown tool ${id}`);
  return { title: `Try it: ${t.title}`, to: `/docs/playground/${id}`, playground: true };
}

export const docsNav: NavSection[] = [
  {
    title: "Getting started",
    items: [doc("introduction"), doc("installation"), doc("quick-start"), { title: "Playground overview", to: "/docs/playground", playground: true }],
  },
  {
    title: "Configuration",
    items: [
      { title: "Basics", items: [doc("configuration"), doc("networks"), tryIt("configurations"), tryIt("rpc")] },
      { title: "Providers", items: [doc("providers", "Provider model"), doc("helius", "Helius (optional)")] },
    ],
  },
  {
    title: "Core Solana",
    items: [
      doc("architecture"),
      { title: "RPC", items: [doc("rpc", "RPC client")] },
      { title: "Readers", items: [doc("readers"), tryIt("accounts")] },
      { title: "Transactions", items: [doc("transactions", "Transactions & parsing"), tryIt("transactions")] },
    ],
  },
  {
    title: "Domain APIs",
    items: [
      { title: "Payments", items: [doc("payments"), tryIt("payments")] },
      { title: "Tokens", items: [doc("spl-tokens"), doc("token-infrastructure"), doc("token-discovery"), tryIt("tokens")] },
      {
        title: "Trading",
        items: [doc("pool-discovery"), doc("swap-quotes"), doc("swap-transactions"), doc("swap-execution"), doc("trading", "Trading integration"), tryIt("trading")],
      },
      doc("nfts"),
      { title: "Programs & PDAs", items: [doc("programs"), doc("pdas"), tryIt("pdas")] },
    ],
  },
  { title: "Signing & streaming", items: [doc("wallets"), doc("signing"), doc("streaming")] },
  { title: "Reference", items: [doc("api-reference"), doc("examples"), doc("security"), doc("faq")] },
];

export function adjacentDocs(slug: string) {
  const index = DOCS.findIndex((d) => d.slug === slug);
  return {
    previous: index > 0 ? DOCS[index - 1] : undefined,
    next: index >= 0 && index < DOCS.length - 1 ? DOCS[index + 1] : undefined,
  };
}
