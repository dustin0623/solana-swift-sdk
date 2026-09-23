/**
 * Base58 (Bitcoin alphabet) — the canonical encoding for Solana addresses,
 * signatures and account data blobs.
 *
 * This is plain data encoding, not cryptography.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const INDEX: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < ALPHABET.length; i += 1) map[ALPHABET[i] as string] = i;
  return map;
})();

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += (digits[i] as number) << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    out += ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) out += ALPHABET[digits[i] as number];
  return out;
}

export function base58Decode(value: string): Uint8Array {
  if (value.length === 0) return new Uint8Array(0);

  const bytes: number[] = [0];
  for (const char of value) {
    const digit = INDEX[char];
    if (digit === undefined) {
      throw new Error(`Invalid base58 character "${char}"`);
    }
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += (bytes[i] as number) * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  for (const char of value) {
    if (char !== ALPHABET[0]) break;
    leadingZeros += 1;
  }

  const out = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[leadingZeros + i] = bytes[bytes.length - 1 - i] as number;
  }
  return out;
}

export function isBase58(value: string): boolean {
  if (value.length === 0) return false;
  for (const char of value) {
    if (INDEX[char] === undefined) return false;
  }
  return true;
}
