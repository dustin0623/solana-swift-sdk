import type { Address } from "../types/index";

export interface ProgramInvocation {
  programId: Address;
  depth: number;
  success: boolean | null;
  logs: string[];
}

const INVOKE = /^Program (\S+) invoke \[(\d+)\]$/;
const SUCCESS = /^Program (\S+) success$/;
const FAILED = /^Program (\S+) failed: (.+)$/;

/**
 * Reads program invocation structure out of transaction logs.
 *
 * Logs are best-effort by nature: a program can print anything. Nothing here
 * is inferred beyond the runtime's own invoke/success/failed markers, and the
 * raw lines are always preserved.
 */
export class LogParser {
  public static invocations(logs: readonly string[]): ProgramInvocation[] {
    const out: ProgramInvocation[] = [];
    const stack: ProgramInvocation[] = [];

    for (const line of logs) {
      const invoke = INVOKE.exec(line);
      if (invoke) {
        const entry: ProgramInvocation = {
          programId: invoke[1] as Address,
          depth: Number(invoke[2]),
          success: null,
          logs: [],
        };
        stack.push(entry);
        out.push(entry);
        continue;
      }

      const success = SUCCESS.exec(line);
      if (success) {
        const entry = stack.pop();
        if (entry) entry.success = true;
        continue;
      }

      const failed = FAILED.exec(line);
      if (failed) {
        const entry = stack.pop();
        if (entry) {
          entry.success = false;
          entry.logs.push(line);
        }
        continue;
      }

      stack[stack.length - 1]?.logs.push(line);
    }

    return out;
  }

  /** Distinct program ids that were invoked, in first-seen order. */
  public static programs(logs: readonly string[]): Address[] {
    const seen = new Set<Address>();
    for (const invocation of LogParser.invocations(logs)) seen.add(invocation.programId);
    return [...seen];
  }

  /** Anchor-style `Program log:` lines, with the prefix removed. */
  public static messages(logs: readonly string[]): string[] {
    return logs
      .filter((line) => line.startsWith("Program log: "))
      .map((line) => line.slice("Program log: ".length));
  }
}
