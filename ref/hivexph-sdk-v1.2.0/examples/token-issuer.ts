/** Backend only: issue, transfer and burn Hive Engine tokens. Keys stay in the environment. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient({
  accounts: {
    treasury: { accountEnv: "TREASURY_ACCOUNT", keyEnv: "TREASURY_ACTIVE_KEY" },
  },
});

try {
  await hive.issuer.token.issue({
    from: hive.accounts.treasury,
    symbol: "MYTOKEN",
    account: "bob",
    quantity: "10",
  });

  await hive.issuer.token.transfer({
    from: hive.accounts.treasury,
    symbol: "MYTOKEN",
    account: "carol",
    quantity: "2.5",
  });

  // Burn is a transfer to the null account unless another account is given.
  await hive.issuer.token.burn({
    from: hive.accounts.treasury,
    symbol: "MYTOKEN",
    quantity: "1",
  });
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
