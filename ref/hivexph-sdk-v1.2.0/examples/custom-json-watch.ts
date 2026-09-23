/** Watch live custom_json events for one application id and a set of actions. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient();
const controller = new AbortController();
setTimeout(() => controller.abort(), 60_000);

try {
  for await (const event of hive.customJson.watch({
    id: "my-application",
    actions: ["claim", "purchase", "upgrade"],
    signal: controller.signal,
  })) {
    console.log(event.blockNumber, event.account, event.action, event.metadata);
  }
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
