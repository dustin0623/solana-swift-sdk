/** Watch payments and deliver value only after Layer 2 execution is verified. */
import { HiveClient, HiveSdkError } from "hivexph-sdk";

const hive = new HiveClient();
const controller = new AbortController();

try {
  for await (const payment of hive.payments.watch({
    signal: controller.signal,
    filters: {
      account: "my-store",
      symbol: "MYTOKEN",
      actions: ["purchase"],
      requireTrigger: true,
    },
    onSuccess: (verified) => console.log("settled:", verified.transactionId),
    onFailed: (failed) => console.warn("layer 2 failed:", failed.error),
  })) {
    console.log(payment.status, payment.transfer.from, payment.transfer.quantity);
  }
} catch (error) {
  if (error instanceof HiveSdkError) console.error(error.code, error.message);
  else throw error;
}
