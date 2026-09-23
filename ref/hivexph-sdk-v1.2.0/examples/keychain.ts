/** Browser only: sign a standardized Custom JSON with the Hive Keychain extension. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient();

export async function claim(username: string) {
  if (!hive.keychain.isAvailable()) {
    throw new Error("Hive Keychain is not installed.");
  }

  try {
    const result = await hive.keychain.customJson({
      username,
      id: "my-application",
      action: "claim",
      metadata: { rewardId: "abc" },
      authority: "posting",
      message: "Claim your reward",
    });
    console.log("broadcast:", result.transactionId);
  } catch (error) {
    if (error instanceof HiveSdkError && error.code === "KEYCHAIN_REJECTED") {
      console.log("User cancelled the signature.");
      return;
    }
    throw error;
  }
}
