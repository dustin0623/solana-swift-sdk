// Mirror of package-manager/tests/fixtures.ts for the browser playground.
import { base58Encode } from "@solanaxph-sdk";

const byte = (n: number) => base58Encode(new Uint8Array(32).fill(n));
export const alice = byte(1);
export const bob = byte(2);
export const mint = byte(4);
export const aliceAta = "8ZfjnwxdKftw8Kk9xcDmsR2kdyDJhHSaTo2uWypq4m8g";
export const bobAta = "Gw9YRejU7bwbcgNxWYeYBjrS5Z9Mzhf2heC58voURatW";

export const SOL_TRANSFER_SIGNATURE = "soltransfer123456789".padEnd(87, "0");
export const SPL_TRANSFER_SIGNATURE = "spltransfer123456789".padEnd(87, "0");
