import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/installation")({
  head: () => ({
    meta: [
      { title: "Installation — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Install hivexph-sdk with npm, pnpm, yarn or bun and create your first HiveClient in a browser or server runtime.",
      },
      { property: "og:title", content: "Installation — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Package install, requirements and the first HiveClient instance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstallationPage,
});

const toc = [
  { id: "install", label: "Install" },
  { id: "requirements", label: "Requirements" },
  { id: "first-client", label: "First client" },
];

function InstallationPage() {
  return (
    <DocPage
      eyebrow="Getting started"
      title="Installation"
      description="The package is dependency-free TypeScript. It runs in browsers, Node, edge runtimes and workers — anything with fetch."
      path="/docs/installation"
      toc={toc}
    >
      <DocSection id="install" title="Install">
        <CodeBlock
          language="bash"
          code={`npm install hivexph-sdk
# pnpm add hivexph-sdk
# yarn add hivexph-sdk
# bun add hivexph-sdk`}
        />
      </DocSection>

      <DocSection id="requirements" title="Requirements">
        <Prose>
          <p>
            TypeScript 5+ and a runtime with a global <code>fetch</code>. Browser signing
            additionally requires the Hive Keychain extension; backend signing requires the account
            and key environment variables described in the configuration section.
          </p>
        </Prose>
        <Callout tone="warning">
          Never import a backend configuration module into browser code. Key environment variables
          must only be readable in a server runtime.
        </Callout>
      </DocSection>

      <DocSection id="first-client" title="First client">
        <CodeBlock
          language="typescript"
          filename="hive.ts"
          code={`import { HiveClient } from "hivexph-sdk";

export const hive = new HiveClient({
  // Optional: override the default public RPC node.
  endpoint: "https://api.hive.blog",
});

const props = await hive.rpc.getDynamicGlobalProperties();
console.log(props.head_block_number);`}
        />
      </DocSection>
    </DocPage>
  );
}
