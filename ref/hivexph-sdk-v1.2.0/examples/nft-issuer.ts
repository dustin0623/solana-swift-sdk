/** Backend only: issue, transfer and burn Hive Engine NFTs. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient({
  accounts: {
    issuer: { accountEnv: "ISSUER_ACCOUNT", keyEnv: "ISSUER_ACTIVE_KEY" },
  },
});

try {
  await hive.issuer.nft.issue({
    from: hive.accounts.issuer,
    symbol: "MYNFT",
    to: "bob",
    properties: { level: 1 },
  });

  await hive.issuer.nft.transfer({
    from: hive.accounts.issuer,
    symbol: "MYNFT",
    to: "carol",
    ids: ["1"],
  });

  // Burn sends the instances to the null account by default.
  await hive.issuer.nft.burn({
    from: hive.accounts.issuer,
    symbol: "MYNFT",
    ids: ["2"],
  });
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
