import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/payment-validation")({
  head: () => ({
    meta: [
      { title: "Payment Validation — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Parse a transaction into normalized payments and validate sender, recipient, amount, action and Layer 2 execution before delivering anything.",
      },
      { property: "og:title", content: "Payment Validation — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Verify a payment exists, executed and matches your expectations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentValidationPage,
});

const toc = [
  { id: "parse", label: "Parsing a transaction" },
  { id: "validate", label: "Validating expectations" },
  { id: "result", label: "The result shape" },
  { id: "idempotency", label: "Idempotency" },
];

function PaymentValidationPage() {
  return (
    <DocPage
      eyebrow="Payments"
      title="Parsing and validating payments"
      description="Reading a payment answers three separate questions: did it happen, did it execute, and is it the payment you were waiting for. The SDK keeps them separate so you never conflate them."
      path="/docs/payment-validation"
      toc={toc}
    >
      <DocSection id="parse" title="Parsing a transaction">
        <CodeBlock
          language="typescript"
          code={`const payments = await hive.payments.parse({ transactionId: id });

payments[0];
// {
//   network: "hive",
//   transactionId: "abc…",
//   operationIndex: 0,
//   success: null,          // parse never verifies execution
//   status: "pending",
//   transfer: { from: "alice", account: "bob", symbol: "HIVE", quantity: "10.000" },
//   trigger: { action: "purchase", metadata: { orderId: "A-1029" } },
// }`}
        />
        <Prose>
          <p>
            A transaction can carry several payments. A memo that is not valid standardized JSON is
            not an error: <code>trigger</code> is simply <code>null</code>. Read the returned{" "}
            <code>network</code> field to see which layer the payment came from — detection is
            automatic.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="validate" title="Validating expectations">
        <CodeBlock
          language="typescript"
          code={`const result = await hive.payments.validate({
  transactionId: id,
  expected: {
    from: "alice",
    account: "treasury-account",
    symbol: "HIVE",
    quantity: "10.000",
    action: "purchase",
  },
});

switch (result.status) {
  case "success":   return fulfil(result);
  case "invalid":   return reject(result.error);   // executed, wrong details
  case "failed":    return reject("execution failed");
  case "pending":   return retryLater();
  case "not_found": return reject("unknown transaction");
}`}
        />
        <ParamTable
          caption="PaymentExpectation (all optional)"
          rows={[
            { name: "from", type: "string", description: "Expected sender account." },
            { name: "account", type: "string", description: "Expected recipient account." },
            { name: "symbol", type: "string", description: "Expected asset or token symbol." },
            {
              name: "quantity",
              type: "string",
              description: 'Compared numerically as digits — "100" equals "100.000".',
            },
            { name: "action", type: "string", description: "Expected trigger action name." },
          ]}
        />
      </DocSection>

      <DocSection id="result" title="The result shape">
        <Prose>
          <p>
            A validation result is a <code>ParsedPayment</code> with a verified <code>status</code>{" "}
            and a boolean <code>success</code>. For native payments, existence is success. For Hive
            Engine, the sidechain logs decide.
          </p>
        </Prose>
        <ParamTable
          caption="ParsedPayment"
          rows={[
            {
              name: "network",
              type: '"hive" | "engine"',
              description: "Detected automatically — where the payment lives.",
            },
            { name: "transactionId", type: "string | null", description: "Hive transaction id." },
            {
              name: "operationIndex",
              type: "number",
              description: "Position inside the transaction.",
            },
            {
              name: "success",
              type: "boolean | null",
              description: "null when execution was not verified.",
            },
            { name: "status", type: "PaymentStatus", description: "Lifecycle status." },
            {
              name: "transfer",
              type: "PaymentTransfer",
              description: "from, account, symbol, quantity, memo.",
            },
            {
              name: "trigger",
              type: "ActionPayload | null",
              description: "The standardized action payload, when the memo carried one.",
            },
            { name: "error", type: "string?", description: "Why it is invalid or failed." },
          ]}
        />
      </DocSection>

      <DocSection id="idempotency" title="Idempotency">
        <Callout>
          The SDK is stateless. Store <code>transactionId</code> plus <code>operationIndex</code> as
          your delivery key, and check it before crediting anything — a stream restart will legally
          replay blocks you already processed.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
