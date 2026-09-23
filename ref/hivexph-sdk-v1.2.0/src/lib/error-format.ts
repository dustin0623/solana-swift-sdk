/** Human readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/** Serializable representation of a thrown value for the raw error view. */
export function errorRaw(error: unknown): unknown {
  if (error instanceof Error) {
    const extra = error as Error & { code?: unknown; raw?: unknown };
    return { name: error.name, message: error.message, code: extra.code, raw: extra.raw };
  }
  return error;
}
