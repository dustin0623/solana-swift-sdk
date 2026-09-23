import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/compatibility")({
  head: () => ({
    meta: [
      { title: "Node vs browser — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Which HiveXPH SDK namespaces run in Node, workers and browsers: reading and streaming run everywhere, Keychain is browser-only, backend signing is server-only.",
      },
      { property: "og:title", content: "Node vs browser — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Environment matrix for reading, streaming, Keychain and backend signing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompatibilityPage,
});

const toc = [
  { id: "matrix", label: "Matrix" },
  { id: "runtimes", label: "Runtimes" },
  { id: "bundling", label: "Package shape" },
];

const rows: Array<{ feature: string; node: string; browser: string; note: string }> = [
  { feature: "hive.rpc", node: "Yes", browser: "Yes", note: "fetch only" },
  { feature: "hive.beacon", node: "Yes", browser: "Yes", note: "Node discovery" },
  { feature: "hive.reader.transaction()", node: "Yes", browser: "Yes", note: "Read by id" },
  { feature: "hive.blocks.watch()", node: "Yes", browser: "Yes", note: "Async generator" },
  { feature: "hive.customJson.watch()", node: "Yes", browser: "Yes", note: "Async generator" },
  { feature: "hive.payments.watch()", node: "Yes", browser: "Yes", note: "Async generator" },
  { feature: "hive.payments.validate()", node: "Yes", browser: "Yes", note: "Read-only" },
  { feature: "hive.builder / hive.parser", node: "Yes", browser: "Yes", note: "Pure functions" },
  { feature: "hive.keychain", node: "No", browser: "Yes", note: "KEYCHAIN_UNAVAILABLE elsewhere" },
  { feature: "hive.keychainIssuer", node: "No", browser: "Yes", note: "KEYCHAIN_UNAVAILABLE elsewhere" },
  { feature: "hive.issuer", node: "Yes", browser: "No", note: "Backend only — reads key env vars" },
];

function CompatibilityPage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Node vs browser"
      description="One package, two writing paths. Everything that reads the chain runs anywhere; signing is either backend keys or the Hive Keychain extension."
      path="/docs/compatibility"
      toc={toc}
    >
      <DocSection id="matrix" title="Matrix">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface/60">
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Feature
                </th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Node / workers
                </th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Browser
                </th>
                <th className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono text-[13px] text-foreground">{row.feature}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-accent">{row.node}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-accent">{row.browser}</td>
                  <td className="px-3 py-2 text-[13px] text-muted-foreground">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout tone="security">
          Backend issuing reads private keys from environment variables. Never bundle a
          configuration with <code>keyEnv</code> into browser code — use{" "}
          <code>hive.keychainIssuer</code> there.
        </Callout>
      </DocSection>

      <DocSection id="runtimes" title="Runtimes">
        <Prose>
          <p>
            Node 18+, Bun, Deno, Cloudflare Workers and every modern browser are supported. The SDK
            uses global <code>fetch</code>, reads <code>process.env</code> only through a guarded
            resolver, and touches no DOM API at module scope, so importing it during server
            rendering is safe.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`// Browser-only calls fail predictably instead of throwing ReferenceError.
try {
  await hive.keychain.customJson({ username: "alice", id: "my-app", action: "claim" });
} catch (error) {
  // error.code === "KEYCHAIN_UNAVAILABLE" on the server
}`}
        />
      </DocSection>

      <DocSection id="bundling" title="Package shape">
        <Prose>
          <p>
            ESM only, one entry point (<code>hivexph-sdk</code>), bundled type declarations, no side
            effects on import: constructing a client opens no connection and starts no stream.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
