/**
 * One Hive Engine NFT action per console: create, issue, issue multiple,
 * transfer or burn. Mirrors TokenActionPanel: only the fields the action
 * needs, with both the backend alias path and the Keychain path.
 */
import { useState } from "react";
import { Gem, Wallet } from "lucide-react";
import { HiveClient } from "@package";
import type { IssuerOperationPreview } from "@package";
import { useHive } from "@/lib/hive-client";
import { errorMessage, errorRaw } from "@/lib/error-format";
import { PageHeader } from "@/components/playground/PageHeader";
import { JsonBlock } from "@/components/playground/JsonBlock";
import { ErrorPanel } from "@/components/playground/ResultPanel";
import { Field, Panel, buttonClass } from "@/components/playground/form-ui";

export type NftAction = "create" | "issue" | "issue-multiple" | "transfer" | "burn";

const copy: Record<NftAction, { title: string; description: string }> = {
  create: {
    title: "Create an NFT collection",
    description:
      "Creating a collection costs 100 BEE. Only the NFT name and symbol are required — organization, product name, max supply, website and authorized issuers are optional and editable later in the TribalDex NFT manager.",
  },
  issue: {
    title: "Issue an NFT",
    description: "Mint a single NFT instance into a destination account with its properties.",
  },
  "issue-multiple": {
    title: "Issue multiple NFTs",
    description: "Mint several instances in one contract action, sharing the same properties.",
  },
  transfer: {
    title: "Transfer NFTs",
    description: "Move one or more NFT instance ids to another account.",
  },
  burn: {
    title: "Burn NFTs",
    description: 'Send NFT instance ids to the burn destination — "null" when left empty.',
  },
};

export function NftActionPanel({ action }: { action: NftAction }) {
  const { hive, endpoint } = useHive();

  const [alias, setAlias] = useState("nftIssuer");
  const [aliasAccount, setAliasAccount] = useState("issuer-account");
  const [username, setUsername] = useState("");
  const [symbol, setSymbol] = useState("COLLECTION");
  const [account, setAccount] = useState("destination");
  const [feeSymbol, setFeeSymbol] = useState("BEE");
  const [properties, setProperties] = useState('{ "level": 1, "rarity": "rare" }');
  const [copies, setCopies] = useState("2");
  const [ids, setIds] = useState("1,2,3");
  const [burnAccount, setBurnAccount] = useState("");

  const [name, setName] = useState("Test Collection");
  const [orgName, setOrgName] = useState("");
  const [productName, setProductName] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [website, setWebsite] = useState("");
  const [issuingAccounts, setIssuingAccounts] = useState("");
  const [issuingContracts, setIssuingContracts] = useState("");

  const [result, setResult] = useState<IssuerOperationPreview | null>(null);
  const [keychainResult, setKeychainResult] = useState<unknown>(null);
  const [error, setError] = useState<{ message: string; raw: unknown } | null>(null);

  const run = async (fn: () => Promise<IssuerOperationPreview> | IssuerOperationPreview) => {
    setError(null);
    setResult(null);
    try {
      setResult(await fn());
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  const keychainRun = async (fn: () => Promise<unknown> | unknown) => {
    setError(null);
    setKeychainResult(null);
    try {
      setKeychainResult(await fn());
    } catch (caught) {
      setError({ message: errorMessage(caught), raw: errorRaw(caught) });
    }
  };

  const context = () => {
    const aliasName = alias.trim();
    const accounts =
      aliasName && aliasAccount.trim() ? { [aliasName]: { account: aliasAccount.trim() } } : {};
    return new HiveClient({ endpoint, accounts });
  };
  const fromRef = () => context().account(alias.trim());

  const parseProperties = (): Record<string, unknown> | undefined => {
    const text = properties.trim();
    if (!text) return undefined;
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("properties must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  };

  const idList = () =>
    ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

  const mintFields = () => {
    const props = parseProperties();
    return {
      symbol: symbol.trim(),
      account: account.trim(),
      feeSymbol: feeSymbol.trim(),
      ...(props ? { properties: props } : {}),
    };
  };

  const multipleFields = () => {
    const fields = mintFields();
    const count = Math.max(1, Number(copies) || 1);
    return { instances: Array.from({ length: count }, () => ({ ...fields })) };
  };

  const transferFields = () => ({
    account: account.trim(),
    nfts: [{ symbol: symbol.trim(), ids: idList() }],
  });

  const burnFields = () => ({
    symbol: symbol.trim(),
    id: idList(),
    ...(burnAccount.trim() ? { account: burnAccount.trim() } : {}),
  });

  const createFields = () => {
    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const list = (value: string) => {
      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return items.length > 0 ? items : undefined;
    };
    const org = optional(orgName);
    const product = optional(productName);
    const supply = optional(maxSupply);
    const site = optional(website);
    const accounts = list(issuingAccounts);
    const contracts = list(issuingContracts);
    return {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      ...(org ? { orgName: org } : {}),
      ...(product ? { productName: product } : {}),
      ...(supply ? { maxSupply: supply } : {}),
      ...(site ? { website: site } : {}),
      ...(accounts ? { authorizedIssuingAccounts: accounts } : {}),
      ...(contracts ? { authorizedIssuingContracts: contracts } : {}),
    };
  };

  const buildBackend = () =>
    run(async () => {
      const nft = context().issuer.nft;
      const from = fromRef();
      if (action === "issue") return nft.buildIssue({ from, ...mintFields() });
      if (action === "issue-multiple") return nft.buildIssueMultiple({ from, ...multipleFields() });
      if (action === "transfer") return nft.buildTransfer({ from, ...transferFields() });
      if (action === "burn") return nft.buildBurn({ from, ...burnFields() });
      return nft.buildCreate({ from, ...createFields() });
    });

  const buildKeychain = () =>
    keychainRun(() => {
      const nft = hive.keychainIssuer.nft;
      if (action === "issue") return nft.buildIssue(mintFields());
      if (action === "issue-multiple") return nft.buildIssueMultiple(multipleFields());
      if (action === "transfer") return nft.buildTransfer(transferFields());
      if (action === "burn") return nft.buildBurn(burnFields());
      return nft.buildCreate(createFields());
    });

  const broadcast = () =>
    keychainRun(() => {
      const nft = hive.keychainIssuer.nft;
      const username_ = username.trim();
      if (action === "issue") return nft.issue({ username: username_, ...mintFields() });
      if (action === "issue-multiple")
        return nft.issueMultiple({ username: username_, ...multipleFields() });
      if (action === "transfer") return nft.transfer({ username: username_, ...transferFields() });
      if (action === "burn") return nft.burn({ username: username_, ...burnFields() });
      return nft.create({ username: username_, ...createFields() });
    });

  const keychainCheck = () =>
    keychainRun(() =>
      hive.keychainIssuer.nft.checkCreate({
        username: username.trim(),
        symbol: createFields().symbol,
      }),
    );

  const serverCheck = () =>
    keychainRun(() => context().issuer.nft.checkCreate({ from: fromRef(), ...createFields() }));

  const keychainAvailable = hive.keychain.isAvailable();
  const text = copy[action];
  const usesProperties = action === "issue" || action === "issue-multiple";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="hive.issuer.nft" title={text.title} description={text.description} />

      {error ? <ErrorPanel message={error.message} raw={error.raw} /> : null}

      <Panel title="Action input" icon={<Gem className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NFT symbol *" value={symbol} onChange={setSymbol} />

          {action === "create" ? (
            <>
              <Field label="NFT name *" value={name} onChange={setName} hint="Maximum 50 characters." />
              <Field label="Organization name" value={orgName} onChange={setOrgName} hint="Optional." />
              <Field label="Product name" value={productName} onChange={setProductName} hint="Optional." />
              <Field
                label="Max supply"
                value={maxSupply}
                onChange={setMaxSupply}
                placeholder="unlimited"
                hint="Optional — unlimited when empty."
              />
              <Field
                label="Website"
                value={website}
                onChange={setWebsite}
                placeholder="https://example.com"
                hint="Optional."
              />
              <Field
                label="Authorized issuing accounts"
                value={issuingAccounts}
                onChange={setIssuingAccounts}
                hint="Optional, comma separated."
              />
              <Field
                label="Authorized issuing contracts"
                value={issuingContracts}
                onChange={setIssuingContracts}
                hint="Optional, comma separated."
              />
            </>
          ) : null}

          {action !== "create" && action !== "burn" ? (
            <Field label="To (account)" value={account} onChange={setAccount} />
          ) : null}

          {usesProperties ? <Field label="Fee symbol" value={feeSymbol} onChange={setFeeSymbol} /> : null}

          {action === "issue-multiple" ? (
            <Field label="Instances" value={copies} onChange={setCopies} />
          ) : null}

          {action === "transfer" || action === "burn" ? (
            <Field label="NFT ids (comma separated)" value={ids} onChange={setIds} />
          ) : null}

          {action === "burn" ? (
            <Field
              label="Burn destination"
              value={burnAccount}
              onChange={setBurnAccount}
              placeholder="null"
              hint='Optional — defaults to the Hive account "null".'
            />
          ) : null}
        </div>

        {usesProperties ? (
          <Field label="Properties (JSON object)" value={properties} onChange={setProperties} textarea />
        ) : null}
      </Panel>

      <Panel title="Backend signing (configuration alias)" icon={<Gem className="h-4 w-4 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From (account alias)" value={alias} onChange={setAlias} />
          <Field label="Alias → Hive account" value={aliasAccount} onChange={setAliasAccount} />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={buildBackend}>
            Preview server payload
          </button>
          {action === "create" ? (
            <button type="button" className={buttonClass} onClick={serverCheck}>
              Server preflight check
            </button>
          ) : null}
        </div>
      </Panel>

      <Panel title="Hive Keychain (browser account)" icon={<Wallet className="h-4 w-4 text-primary" />}>
        <div className="sm:max-w-sm">
          <Field
            label="Signing Hive account"
            value={username}
            onChange={setUsername}
            placeholder="your-hive-account"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass} onClick={buildKeychain}>
            Preview Keychain payload
          </button>
          {action === "create" ? (
            <button
              type="button"
              className={buttonClass}
              disabled={!username.trim()}
              onClick={keychainCheck}
            >
              Keychain preflight check
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass}
            disabled={!keychainAvailable || !username.trim()}
            onClick={broadcast}
          >
            {action === "create" ? "Create with Keychain" : "Broadcast with Keychain"}
          </button>
        </div>
        {!keychainAvailable ? (
          <p className="text-xs text-muted-foreground">
            Hive Keychain was not detected in this browser. Previewing the payload still works.
          </p>
        ) : null}
      </Panel>

      {keychainResult ? (
        <Panel title="Keychain output">
          <JsonBlock value={keychainResult} />
        </Panel>
      ) : null}

      {result ? (
        <Panel title="Action & custom_json operation">
          <JsonBlock value={result} />
        </Panel>
      ) : null}
    </div>
  );
}
