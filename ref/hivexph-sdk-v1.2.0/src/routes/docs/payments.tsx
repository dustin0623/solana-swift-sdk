import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Triggers — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Turn HIVE, HBD and Hive Engine transfers into actions: one standardized { action, metadata } trigger carried by the transfer memo across both networks.",
      },
      { property: "og:title", content: "Payments & Triggers — HiveXPH SDK" },
      {
        property: "og:description",
        content: "One payment protocol for native Hive and Hive Engine transfers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentsPage,
});

const toc = [
  { id: "idea", label: "The idea" },
  { id: "protocol", label: "One payload, many transports" },
  { id: "namespace", label: "The payments namespace" },
  { id: "lifecycle", label: "Payment lifecycle" },
  { id: "rules", label: "Rules the SDK enforces" },
];

function PaymentsPage() {
  return (
    <DocPage
      eyebrow="Payments"
      title="Payments and transfer triggers"
      description="A payment is not just money moving. It is an action request. The SDK carries the same standardized { action, metadata } payload inside the transfer memo, so a HIVE transfer and a Hive Engine token transfer trigger application logic exactly the same way."
      path="/docs/payments"
      toc={toc}
    >
      <DocSection id="idea" title="The idea">
        <Prose>
          <p>
            Custom JSON operations already carry a standardized payload. Payments extend that same
            protocol to value transfers: the memo of a native HIVE/HBD transfer, and the memo of a
            Hive Engine <code>tokens.transfer</code> action, both hold the identical{" "}
            <code>{"{ action, metadata }"}</code> object. Your application reads one shape,
            whichever network the money came from.
          </p>
        </Prose>
        <CodeBlock
          language="json"
          code={`{
  "action": "purchase",
  "metadata": { "orderId": "A-1029", "sku": "pro-plan" }
}`}
        />
      </DocSection>

      <DocSection id="protocol" title="One payload, many transports">
        <ParamTable
          caption="Transports of the standardized payload"
          rows={[
            {
              name: "custom_json",
              type: "json field",
              description: "The original transport — no value attached.",
            },
            {
              name: "HIVE / HBD transfer",
              type: "memo field",
              description: "Native Layer 1 payment. Final as soon as the block is produced.",
            },
            {
              name: "Hive Engine transfer",
              type: "contract memo",
              description:
                "Layer 2 payment inside a custom_json contract action. Execution must be verified.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="namespace" title="The payments namespace">
        <CodeBlock
          language="typescript"
          code={`import { HiveClient } from "hivexph-sdk";

const hive = new HiveClient({
  accounts: { treasury: { accountEnv: "TREASURY_ACCOUNT", keyEnv: "TREASURY_ACTIVE_KEY" } },
});

// Native HIVE payment carrying a trigger
await hive.payments.hive.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  amount: "10.000",
  symbol: "HIVE",
  action: "purchase",
  metadata: { orderId: "A-1029" },
});

// Hive Engine (Layer 2) payment carrying the same trigger
await hive.payments.engine.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  symbol: "SWAP.HIVE",
  quantity: "10",
  action: "purchase",
  metadata: { orderId: "A-1029" },
});`}
        />
        <ParamTable
          caption="hive.payments"
          rows={[
            { name: "hive", type: "HivePaymentClient", description: "Native HIVE / HBD transfers." },
            {
              name: "engine",
              type: "EnginePaymentClient",
              description: "Hive Engine token transfers.",
            },
            {
              name: "parse(input)",
              type: "Promise<ParsedPayment[]>",
              description: "Every payment carried by a transaction id.",
            },
            {
              name: "validate(input)",
              type: "Promise<PaymentValidationResult>",
              description: "Existence + execution + expectation checks.",
            },
            {
              name: "watch(options)",
              type: "AsyncGenerator<ParsedPayment>",
              description: "Live payment detection as an async iterator over the core block stream.",
            },

          ]}
        />
        <Prose>
          <p>
            Browser flows live under <code>hive.keychain.payments.hive</code> and{" "}
            <code>hive.keychain.payments.engine</code>. Native transfers use Keychain's dedicated
            transfer request; Layer 2 transfers are signed as active-authority custom_json.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="lifecycle" title="Payment lifecycle">
        <ParamTable
          caption="PaymentStatus"
          rows={[
            { name: "pending", type: "status", description: "Execution is not verifiable yet." },
            {
              name: "success",
              type: "status",
              description: "Transfer happened and, on Layer 2, the contract executed.",
            },
            {
              name: "failed",
              type: "status",
              description: "The transaction exists but the contract rejected it.",
            },
            {
              name: "invalid",
              type: "status",
              description: "It executed but does not match your expectations.",
            },
            { name: "not_found", type: "status", description: "No payment for that id." },
          ]}
        />
        <Callout tone="warning">
          A Hive Engine payment included in a Hive block has <strong>not</strong> necessarily
          succeeded. Layer 1 inclusion only proves the custom_json was broadcast — the sidechain can
          still reject it. Only <code>validate()</code> or the stream's execution check can report{" "}
          <code>success: true</code>.
        </Callout>
      </DocSection>

      <DocSection id="rules" title="Rules the SDK enforces">
        <Prose>
          <ul>
            <li>Amounts and quantities are decimal strings — never JavaScript numbers.</li>
            <li>Native amounts are normalized to three decimals ("10" becomes "10.000 HIVE").</li>
            <li>A malformed memo never throws in a stream: the trigger is simply null.</li>
            <li>Payloads carry no timestamps — the blockchain is the clock.</li>
            <li>
              The SDK is stateless: idempotency is your application's job, keyed on{" "}
              <code>transactionId</code> plus <code>operationIndex</code>.
            </li>
          </ul>
        </Prose>
      </DocSection>
    </DocPage>
  );
}
