import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/troubleshooting")({
  head: () => ({
    meta: [
      { title: "Common problems — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Diagnose Keychain unavailability, rejected signatures, RPC failures, invalid payloads and failed Layer 2 payments with the SDK error codes.",
      },
      { property: "og:title", content: "Common problems — HiveXPH SDK" },
      {
        property: "og:description",
        content: "What each SDK failure means and the exact fix for it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TroubleshootingPage,
});

const toc = [
  { id: "symptoms", label: "Symptoms" },
  { id: "keychain", label: "Keychain problems" },
  { id: "rpc", label: "RPC problems" },
  { id: "payload", label: "Payload problems" },
  { id: "payments", label: "Payment problems" },
];

function TroubleshootingPage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Common problems"
      description="Every failure below is something the SDK actually reports. Branch on error.code — never on the message text."
      path="/docs/troubleshooting"
      toc={toc}
    >
      <DocSection id="symptoms" title="Symptoms">
        <ParamTable
          caption="Symptom → cause"
          rows={[
            {
              name: "KEYCHAIN_UNAVAILABLE",
              type: "HiveSdkError",
              description:
                "Hive Keychain is not installed, or the call ran outside a browser (SSR, Node, a worker).",
            },
            {
              name: "KEYCHAIN_REJECTED",
              type: "HiveSdkError",
              description: "The user declined the request in the Keychain popup.",
            },
            {
              name: "KEYCHAIN_ERROR",
              type: "HiveSdkError",
              description:
                "Keychain returned an error: wrong authority, unknown account, or a broadcast rejection from the node.",
            },
            {
              name: "RPC_ERROR / HTTP_ERROR",
              type: "HiveSdkError",
              description:
                "The node answered with a JSON-RPC error, or every endpoint in the fallback list failed.",
            },
            {
              name: "NOT_FOUND",
              type: "HiveSdkError",
              description:
                "The transaction id does not exist yet, or it is older than the node's history window.",
            },
            {
              name: "PARSE_ERROR",
              type: "HiveSdkError",
              description: "A payload could not be read as JSON.",
            },
            {
              name: "VALIDATION_ERROR",
              type: "HiveSdkError",
              description:
                "An account name, token symbol, quantity or standardized payload failed validation before anything was broadcast.",
            },
            {
              name: "ENV_VAR_MISSING / SIGNING_KEY_MISSING",
              type: "HiveSdkError",
              description:
                "A backend operation needs an account or key environment variable that is not set in this runtime.",
            },
            {
              name: "BROADCAST_ERROR",
              type: "HiveSdkError",
              description:
                "The signed transaction was rejected by the node (insufficient resource credits, bad authority, duplicate transaction).",
            },
          ]}
        />
      </DocSection>

      <DocSection id="keychain" title="Keychain problems">
        <Prose>
          <p>
            Check availability before rendering a signing button. Availability is false during
            server rendering and stays false until the extension injects itself, so check it after
            hydration.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`if (!hive.keychain.isAvailable()) {
  // Prompt the user to install Hive Keychain instead of calling a signing method.
}

try {
  await hive.keychain.customJson({ username, id: "my-app", action: "claim" });
} catch (error) {
  if (error instanceof HiveSdkError && error.code === "KEYCHAIN_REJECTED") {
    // The user cancelled — this is a normal outcome, not a bug.
  }
}`}
        />
      </DocSection>

      <DocSection id="rpc" title="RPC problems">
        <Prose>
          <p>
            Public nodes rate-limit and occasionally lag. Pass a specific <code>endpoint</code>, or
            let Beacon pick healthy nodes, and retry read calls.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const nodes = await hive.beacon.getNodes();
const hive2 = new HiveClient({ endpoint: nodes[0]?.endpoint });`}
        />
      </DocSection>

      <DocSection id="payload" title="Payload problems">
        <Prose>
          <p>
            A malformed payload never crashes a watcher: it is simply not a standardized event.
            Use the validator to see exactly why.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`import { validateActionPayload } from "hivexph-sdk";

const check = validateActionPayload(JSON.parse(json));
if (!check.valid) console.warn(check.reason);`}
        />
      </DocSection>

      <DocSection id="payments" title="Payment problems">
        <Prose>
          <p>
            A Layer 2 transfer that appears on Hive can still fail inside Hive Engine. Treat only
            <code> status === "success"</code> as settled; <code>failed</code> means the sidechain
            rejected the transfer, and <code>pending</code> means execution is not yet verifiable.
          </p>
        </Prose>
        <Callout tone="warning">
          Never deliver value on transaction inclusion alone. Wait for the validated status or the
          <code> onSuccess</code> callback of <code>hive.payments.watch()</code>.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
