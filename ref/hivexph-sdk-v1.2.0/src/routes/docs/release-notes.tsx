import { createFileRoute } from "@tanstack/react-router";
import { DocPage, DocSection, Prose } from "@/components/docs/DocPage";
import { Callout } from "@/components/docs/Callout";

export const Route = createFileRoute("/docs/release-notes")({
  head: () => ({
    meta: [
      { title: "Release notes — HiveXPH SDK" },
      {
        name: "description",
        content:
          "HiveXPH SDK v1.2.0 adds Keychain sign-in and checked Hive Engine token creation, on the v1.0.0 stable foundation.",
      },
      { property: "og:title", content: "Release notes — HiveXPH SDK" },
      {
        property: "og:description",
        content: "What shipped in v1.2.0, v1.0.0 and what the stability promise covers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReleaseNotesPage,
});

const toc = [
  { id: "v120", label: "v1.2.0" },
  { id: "v1", label: "v1.0.0" },
  { id: "policy", label: "Stability policy" },
];

function ReleaseNotesPage() {
  return (
    <DocPage
      eyebrow="Reference"
      title="Release notes"
      description="Version history for the hivexph-sdk package."
      path="/docs/release-notes"
      toc={toc}
    >
      <DocSection id="v120" title="v1.2.0 — Keychain sign-in + checked token creation">
        <Prose>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Added <code>hive.keychain.requestSignIn()</code> for account ownership checks through
              Hive Keychain.
            </li>
            <li>
              Added typed <code>KeychainSignInInput</code> and <code>KeychainSignInResult</code>
              exports from the package entry point.
            </li>
            <li>Added a sign-in tab to the Keychain playground.</li>
            <li>
              Added <code>hive.keychainIssuer.token.create()</code> and{" "}
              <code>hive.issuer.token.create()</code> for the Hive Engine{" "}
              <code>tokens.create</code> action.
            </li>
            <li>
              Both run a preflight first: the account must hold at least the sidechain creation fee
              in BEE, and the symbol must not already exist. Failures throw{" "}
              <code>INSUFFICIENT_BEE</code> or <code>TOKEN_ALREADY_EXISTS</code> before anything is
              signed.
            </li>
            <li>
              Added <code>checkCreate()</code> and the exported <code>TokenCreationChecker</code> for
              reading the fee, the BEE balance and symbol availability without creating anything.
            </li>
            <li>
              Added <code>buildCreate()</code> offline payload previews and a create panel in the
              token playground.
            </li>
            <li>
              Added <code>hive.keychainIssuer.nft.create()</code> and{" "}
              <code>hive.issuer.nft.create()</code> for the Hive Engine <code>nft.create</code>{" "}
              action, following the same flow as token creation. Only <code>name</code> and{" "}
              <code>symbol</code> are required; <code>orgName</code>, <code>productName</code>,{" "}
              <code>maxSupply</code>, <code>website</code> and the authorized issuing account /
              contract lists are optional.
            </li>
            <li>
              NFT creation runs the same preflight: 100 BEE by default (read from{" "}
              <code>nft.params</code>) and the symbol must be free, otherwise{" "}
              <code>INSUFFICIENT_BEE</code> or <code>NFT_ALREADY_EXISTS</code> throws before signing.
              Pass <code>skipChecks: true</code> to opt out.
            </li>
            <li>
              Added <code>NftCreationChecker</code>, NFT <code>checkCreate()</code> /{" "}
              <code>buildCreate()</code> on both issuers, and an NFT creation panel in the NFT
              playground.
            </li>
          </ul>
        </Prose>
      </DocSection>

      <DocSection id="v1" title="v1.0.0 — initial stable release">
        <Prose>
          <ul className="list-disc space-y-1 pl-5">
            <li>Standardized Custom JSON payloads: {"{"} action, metadata {"}"}</li>
            <li>Raw Custom JSON for protocols with their own payload shape</li>
            <li>Hive Keychain signing in the browser, no key handling in the SDK</li>
            <li>Backend issuer for Hive Engine token issue, transfer and burn</li>
            <li>NFT issue, issue multiple, transfer and burn</li>
            <li>KeychainIssuer emitting byte-identical contract actions from the frontend</li>
            <li>Transaction reader with normalized, classified operations</li>
            <li>One block engine feeding block, Custom JSON and payment watchers</li>
            <li>Native HIVE/HBD and Layer 2 payment parsing, triggers and validation</li>
            <li>Configuration system with account aliases and environment resolution</li>
            <li>Stable error codes on every failure path</li>
          </ul>
        </Prose>
      </DocSection>

      <DocSection id="policy" title="Stability policy">
        <Prose>
          <p>
            v1.0.0 established the public API contract: everything exported from{" "}
            <code>hivexph-sdk</code> is covered by semantic versioning. Breaking changes require a
            major version; additive changes ship as minor releases.
          </p>
        </Prose>
        <Callout tone="info">
          Anything not exported from the package entry point is internal and may change in any
          release.
        </Callout>
      </DocSection>
    </DocPage>
  );
}
