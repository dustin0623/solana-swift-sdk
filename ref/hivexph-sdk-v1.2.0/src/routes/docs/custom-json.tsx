import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";

export const Route = createFileRoute("/docs/custom-json")({
  head: () => ({
    meta: [
      { title: "Custom JSON — HiveXPH SDK" },
      {
        name: "description",
        content:
          "The standardized { action, metadata } Custom JSON envelope, CustomJsonBuilder options and the resulting Hive operation.",
      },
      { property: "og:title", content: "Custom JSON — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Build predictable { action, metadata } Custom JSON operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomJsonPage,
});

const toc = [
  { id: "envelope", label: "The envelope" },
  { id: "builder", label: "CustomJsonBuilder" },
  { id: "params", label: "Parameters" },
];

function CustomJsonPage() {
  return (
    <DocPage
      eyebrow="Core concepts"
      title="Custom JSON"
      description="A standardized envelope makes application data easy to index, parse and validate: every payload is an action name plus an optional metadata object."
      path="/docs/custom-json"
      toc={toc}
      playground={{ to: "/docs/playground/custom-json", label: "Build one in the playground" }}
    >
      <DocSection id="envelope" title="The envelope">
        <CodeBlock
          language="json"
          code={`{
  "action": "claim",
  "metadata": { "rewardId": "123" }
}`}
        />
        <Prose>
          <p>
            The envelope is serialized into the <code>json</code> field of a Hive{" "}
            <code>custom_json</code> operation. <code>metadata</code> may be <code>null</code>.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="builder" title="CustomJsonBuilder">
        <CodeBlock
          language="typescript"
          code={`const operation = hive.builder.buildOperation({
  username: "alice",
  id: "my-application",
  action: "claim",
  metadata: { rewardId: "123" },
  authority: "posting",
});

// [
//   "custom_json",
//   {
//     required_auths: [],
//     required_posting_auths: ["alice"],
//     id: "my-application",
//     json: "{\\"action\\":\\"claim\\",\\"metadata\\":{\\"rewardId\\":\\"123\\"}}"
//   }
// ]`}
        />
      </DocSection>

      <DocSection id="params" title="Parameters">
        <ParamTable
          caption="buildOperation(input)"
          rows={[
            { name: "username", type: "string", required: true, description: "Signing Hive account." },
            { name: "id", type: "string", required: true, description: "Custom JSON id namespace for your application." },
            { name: "action", type: "string", required: true, description: "Action name inside the standardized envelope." },
            { name: "metadata", type: "object | null", description: "Optional payload object. Defaults to null." },
            { name: "authority", type: '"posting" | "active"', description: 'Which authority signs. Defaults to "posting".' },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}
