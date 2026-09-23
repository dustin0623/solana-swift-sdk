/** Read chain state. Runs in Node, Bun, workers and browsers. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient();

try {
  const props = await hive.rpc.getDynamicGlobalProperties();
  console.log("head block:", props.head_block_number);

  const block = await hive.rpc.getBlock(props.head_block_number);
  console.log("transactions in head block:", block?.transactions.length ?? 0);
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
