import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/errors")({
  head: () => ({
    meta: [
      { title: "Errors — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Every SDK error carries a stable code and never leaks secrets: validation, environment, RPC, Keychain and broadcast failures.",
      },
      { property: "og:title", content: "Errors — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Stable, secret-safe error codes for validation, RPC and Keychain failures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ErrorsPage,
});

const toc = [
  { id: "handling", label: "Handling errors" },
  { id: "codes", label: "Error codes" },
];

function ErrorsPage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Errors"
      description="Errors are classes with a code, so you can branch on the code instead of matching message strings. Messages name the environment variable, never its value."
      path="/docs/errors"
      toc={toc}
    >
      <DocSection id="handling" title="Handling errors">
        <CodeBlock
          language="typescript"
          code={`import { HiveSdkError } from "hivexph-sdk";

try {
  await hive.issuer.token.transfer({ from: hive.accounts.treasury, symbol: "MYTOKEN", account: "bob", quantity: "1" });
} catch (error) {
  if (error instanceof HiveSdkError) {
    console.error(error.code, error.message);
  }
}`}
        />
        <Callout tone="security">
          A missing key reports the variable name only — private keys never appear in messages,
          stack traces or logs.
        </Callout>
      </DocSection>

      <DocSection id="codes" title="Error codes">
        <ParamTable
          caption="Stable codes"
          rows={[
            { name: "VALIDATION_ERROR", type: "HiveSdkError", description: "Invalid symbol, quantity, action name or instance count." },
            { name: "CONFIG_NOT_FOUND", type: "HiveConfigurationError", description: "Unknown configuration name." },
            { name: "ACCOUNT_ALIAS_NOT_FOUND", type: "HiveAccountNotFoundError", description: "The account alias is not declared in the configuration." },
            { name: "ACCOUNT_RESOLUTION_ERROR", type: "HiveAccountResolutionError", description: "The alias exists but its account name could not be resolved." },
            { name: "ENV_VAR_MISSING", type: "HiveEnvironmentVariableMissingError", description: "An accountEnv or keyEnv variable is not set." },
            { name: "SIGNING_KEY_MISSING", type: "HiveSigningKeyMissingError", description: "No signing key is available for the account." },
            { name: "SIGNING_ERROR", type: "HiveSigningError", description: "The transaction could not be signed with the resolved key." },
            { name: "RPC_ERROR", type: "HiveSdkError", description: "Every node failed or returned an error response." },
            { name: "BROADCAST_ERROR", type: "HiveSdkError", description: "The node rejected the signed transaction." },
            { name: "KEYCHAIN_UNAVAILABLE", type: "HiveSdkError", description: "The extension is not installed or not injected yet." },
            { name: "KEYCHAIN_REJECTED", type: "HiveSdkError", description: "The user dismissed or rejected the popup." },
          ]}
        />
        <Prose>
          <p>
            Protocol-invalid Custom JSON payloads are not errors: the reader collects them in{" "}
            <code>invalid</code> and the stream reports them through{" "}
            <code>onInvalidPayload</code>.
          </p>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
