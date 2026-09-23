/** Build, serialize and parse the standardized { action, metadata } payload. */
import { HiveClient, HiveSdkError, isActionPayload, validateActionPayload } from "hivexph-sdk";

const hive = new HiveClient();

try {
  const payload = hive.builder.buildPayload({
    action: "purchase",
    metadata: { orderId: "123" },
  });

  const json = hive.builder.serialize(payload);
  console.log(json); // {"action":"purchase","metadata":{"orderId":"123"}}

  const parsed = JSON.parse(json);
  console.log(isActionPayload(parsed)); // true
  console.log(validateActionPayload(parsed)); // { valid: true }
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
