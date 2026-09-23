import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/engine-payments")({
  head: () => ({
    meta: [
      { title: "Hive Engine Payments — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Send Hive Engine token transfers that carry a standardized action trigger, and verify Layer 2 execution instead of trusting block inclusion.",
      },
      { property: "og:title", content: "Hive Engine Payments — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Layer 2 token transfers with triggers and real execution verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnginePaymentsPage,
});

const toc = [
  { id: "shape", label: "What gets broadcast" },
  { id: "backend", label: "Backend transfers" },
  { id: "keychain", label: "Keychain transfers" },
  { id: "execution", label: "Execution is not inclusion" },
];

function EnginePaymentsPage() {
  return (
    <DocPage
      eyebrow="Payments"
      title="Hive Engine payments"
      description="Layer 2 payments are custom_json operations against the ssc-mainnet-hive sidechain. The transfer memo carries the same standardized trigger as a native payment — but success has to be proven with the sidechain logs."
      path="/docs/engine-payments"
      toc={toc}
    >
      <DocSection id="shape" title="What gets broadcast">
        <CodeBlock
          language="json"
          code={`{
  "contractName": "tokens",
  "contractAction": "transfer",
  "contractPayload": {
    "symbol": "SWAP.HIVE",
    "to": "bob",
    "quantity": "10",
    "memo": "{\\"action\\":\\"purchase\\",\\"metadata\\":{\\"orderId\\":\\"A-1029\\"}}"
  }
}`}
        />
        <Prose>
          <p>
            The operation id is <code>ssc-mainnet-hive</code> and it requires the{" "}
            <strong>active</strong> authority. The trigger lives inside the contract memo, so a
            single sidechain transfer both moves tokens and requests an action.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="backend" title="Backend transfers">
        <CodeBlock
          language="typescript"
          code={`const result = await hive.payments.engine.transfer({
  from: hive.accounts.treasury,
  account: "bob",
  symbol: "SWAP.HIVE",
  quantity: "10",        // decimal string, Engine precision
  action: "purchase",
  metadata: { orderId: "A-1029" },
});

// Offline preview — no key, no network
const preview = hive.payments.engine.build({ /* same input */ });
preview.operation; // ["custom_json", { ... }]  ·  preview.json  ·  preview.id`}
        />
        <ParamTable
          caption="hive.payments.engine.transfer(input)"
          rows={[
            { name: "from", type: "AccountReference", description: "Sender account reference." },
            { name: "account", type: "string", description: "Recipient Hive account." },
            { name: "symbol", type: "string", description: "Hive Engine token symbol." },
            { name: "quantity", type: "string", description: "Decimal string quantity." },
            { name: "action", type: "string", description: "Trigger action name." },
            { name: "metadata", type: "object | null", description: "Optional trigger metadata." },
          ]}
        />
      </DocSection>

      <DocSection id="keychain" title="Keychain transfers">
        <CodeBlock
          language="typescript"
          code={`await hive.keychain.payments.engine.transfer({
  username: "alice",
  account: "bob",
  symbol: "SWAP.HIVE",
  quantity: "10",
  action: "purchase",
  metadata: { orderId: "A-1029" },
  message: "Confirm your purchase",
});`}
        />
      </DocSection>

      <DocSection id="execution" title="Execution is not inclusion">
        <Callout tone="warning" title="The Layer 2 trap">
          A Hive block containing your custom_json proves only that the request was broadcast. The
          sidechain evaluates it afterwards and can reject it — insufficient balance, unknown token,
          bad quantity. Crediting a user on block inclusion is how Layer 2 integrations lose money.
        </Callout>
        <Prose>
          <p>
            The SDK asks the Hive Engine RPC for the transaction info and reads its logs. A log with
            an <code>errors</code> array means the contract failed; a transfer event means it
            succeeded; no info yet means <code>pending</code>.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const payment = await hive.payments.validate({
  transactionId: id,   // the network is detected automatically
  expected: { account: "bob", symbol: "SWAP.HIVE", quantity: "10", action: "purchase" },
});

if (payment.success === true) fulfilOrder(payment.trigger?.metadata);
if (payment.status === "pending") retryLater();`}
        />
      </DocSection>
    </DocPage>
  );
}
