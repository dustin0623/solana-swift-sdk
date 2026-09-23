/** Read one transaction by id and inspect its classified operations. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient();

try {
  const result = await hive.reader.transaction({
    transactionId: "7b064a84a968caddd2496f3270f0cecafb954217",
  });

  console.log(result.blockNumber, result.timestamp);
  for (const operation of result.operations) {
    console.log(operation.kind, operation.position.operationIndex);
  }
} catch (error) {
  if (error instanceof HiveSdkError && error.code === "NOT_FOUND") {
    console.log("Transaction not found on this node.");
  } else {
    throw error;
  }
}
