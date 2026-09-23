/** Small byte helpers shared by the encoder, parser and builder. */

export function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Shortvec / compact-u16 length prefix used throughout Solana messages. */
export function encodeLength(value: number): Uint8Array {
  if (value < 0 || !Number.isInteger(value)) {
    throw new Error("Length must be a non-negative integer");
  }
  const out: number[] = [];
  let remaining = value;
  for (;;) {
    let elem = remaining & 0x7f;
    remaining >>= 7;
    if (remaining === 0) {
      out.push(elem);
      break;
    }
    elem |= 0x80;
    out.push(elem);
  }
  return Uint8Array.from(out);
}

export function encodeU64LE(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffffffffffffffffn) {
    throw new Error("u64 out of range");
  }
  const out = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export function encodeU32LE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, true);
  return out;
}

export function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === "function") return btoa(binary);
  // Node / edge fallback without pulling in Buffer types.
  const g = globalThis as { Buffer?: { from(input: string, enc: string): { toString(e: string): string } } };
  if (g.Buffer) return g.Buffer.from(binary, "binary").toString("base64");
  throw new Error("No base64 encoder available in this runtime");
}

export function base64Decode(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  const g = globalThis as {
    Buffer?: { from(input: string, enc: string): Uint8Array };
  };
  if (g.Buffer) return new Uint8Array(g.Buffer.from(value, "base64"));
  throw new Error("No base64 decoder available in this runtime");
}
