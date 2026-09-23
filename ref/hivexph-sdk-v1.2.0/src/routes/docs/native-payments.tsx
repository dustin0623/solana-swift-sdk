import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ParamTable } from "@/components/docs/ParamTable";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/native-payments")({
  head: () => ({
    meta: [
      { title: "Native HIVE & HBD Payments — HiveXPH SDK" },
      {
        name: "description",
        content:
          "Send HIVE and HBD transfers whose memo carries a standardized action trigger, from a backend account alias or through the Hive Keychain extension.",
      },
      { property: "og:title", content: "Native HIVE & HBD Payments — HiveXPH SDK" },
      {
        property: "og:description",
        content: "Layer 1 transfers with triggers: backend signing and Keychain signing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NativePaymentsPage,
});

const toc = [
  { id: "backend", label: "Backend transfers" },
  { id: "preview", label: "Offline preview" },
  { id: "keychain", label: "Keychain transfers" },
  { id: "amounts", label: "Amounts and precision" },
];

function NativePaymentsPage() {
  return (
    <DocPage
      eyebrow="Payments"
      title="Native HIVE and HBD payments"
      description="Layer 1 transfers are final the moment they are included in a block. The memo carries the standardized { action, metadata } trigger, so the payment and the instruction travel together."
      path="/docs/native-payments"
      toc={toc}
    >
      <DocSection id="backend" title="Backend transfers">
        <CodeBlock
          language="typescript"
          code={`const result = await hive.payments.hive.transfer({
  from: hive.accounts.treasury,   // key-free account reference
  account: "bob",                 // recipient
  amount: "10.000",               // decimal string
  symbol: "HIVE",                 // "HIVE" or "HBD"
  action: "reward",
  metadata: { campaign: "launch" },
});

result.transactionId; // string | undefined`}
        />
        <ParamTable
          caption="hive.payments.hive.transfer(input)"
          rows={[
            {
              name: "from",
              type: "AccountReference",
              description: "hive.accounts.<alias> — never a raw alias string.",
            },
            { name: "account", type: "string", description: "Recipient Hive account." },
            { name: "amount", type: "string", description: 'Decimal string, e.g. "10.000".' },
            { name: "symbol", type: '"HIVE" | "HBD"', description: "Native asset symbol." },
            { name: "action", type: "string", description: "Standardized trigger action name." },
            {
              name: "metadata",
              type: "object | null",
              description: "Optional structured payload. Defaults to null.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="preview" title="Offline preview">
        <Prose>
          <p>
            <code>build()</code> resolves the alias and returns the exact operation without
            resolving a private key and without touching the network.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`const preview = hive.payments.hive.build({
  from: hive.accounts.treasury,
  account: "bob",
  amount: "1",
  symbol: "HBD",
  action: "refund",
});

preview.operation;
// ["transfer", { from: "treasury-account", to: "bob", amount: "1.000 HBD",
//                memo: '{"action":"refund","metadata":null}' }]`}
        />
      </DocSection>

      <DocSection id="keychain" title="Keychain transfers">
        <Prose>
          <p>
            In the browser, native transfers use Hive Keychain's dedicated transfer request — not a
            custom_json. The SDK never sees a key.
          </p>
        </Prose>
        <CodeBlock
          language="typescript"
          code={`await hive.keychain.payments.hive.transfer({
  username: "alice",
  account: "bob",
  amount: "5",
  symbol: "HIVE",
  action: "tip",
  metadata: { postId: 42 },
});`}
        />
      </DocSection>

      <DocSection id="amounts" title="Amounts and precision">
        <Callout tone="warning">
          Amounts are strings. Passing a number throws a validation error, because floating point
          silently destroys precision. "10" is normalized to "10.000 HIVE"; more than three decimals
          is rejected.
        </Callout>
        <CodeBlock
          language="typescript"
          code={`import { formatNativeAsset, quantitiesEqual } from "hivexph-sdk";

formatNativeAsset("10", "HIVE");      // "10.000 HIVE"
quantitiesEqual("100", "100.000");    // true — compared as digits, not floats`}
        />
      </DocSection>
    </DocPage>
  );
}
