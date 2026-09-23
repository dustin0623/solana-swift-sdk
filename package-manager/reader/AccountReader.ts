import type { RpcClient } from "../rpc/RpcClient.js";
import type { RpcAccountInfo, CommitmentConfig, RpcKeyedAccount } from "../rpc/types.js";
import type { AccountInfo, Address } from "../types/index.js";
import { assertAddress } from "../utils/address.js";
import { base64Decode } from "../utils/bytes.js";

/** Reads raw and parsed account state. */
export class AccountReader {
  constructor(private readonly rpc: RpcClient) {}

  public async get(address: Address, config?: CommitmentConfig): Promise<AccountInfo | null> {
    const response = await this.rpc.getAccountInfo(assertAddress(address), config);
    return response.value ? AccountReader.normalize(response.value) : null;
  }

  /** Same as `get`, but asks the node to decode known program data. */
  public async parsed(address: Address, config?: CommitmentConfig): Promise<AccountInfo | null> {
    const response = await this.rpc.getParsedAccountInfo(assertAddress(address), config);
    return response.value ? AccountReader.normalize(response.value) : null;
  }

  public async many(
    addresses: readonly Address[],
    config?: CommitmentConfig,
  ): Promise<Array<AccountInfo | null>> {
    if (addresses.length === 0) return [];
    const response = await this.rpc.getMultipleAccounts(
      addresses.map((address) => assertAddress(address)),
      config,
    );
    return response.value.map((account) => (account ? AccountReader.normalize(account) : null));
  }

  public async exists(address: Address, config?: CommitmentConfig): Promise<boolean> {
    return (await this.get(address, config)) !== null;
  }

  public async rentExemptMinimum(dataLength: number): Promise<bigint> {
    return BigInt(await this.rpc.getMinimumBalanceForRentExemption(dataLength));
  }

  public static normalize(account: RpcAccountInfo, _address?: Address): AccountInfo {
    const data = account.data;
    const isTuple = Array.isArray(data);
    return {
      owner: account.owner as Address,
      lamports: BigInt(account.lamports),
      executable: account.executable,
      rentEpoch:
        account.rentEpoch === undefined || account.rentEpoch === null
          ? null
          : BigInt(account.rentEpoch),
      data: isTuple ? decode(data as [string, string]) : new Uint8Array(0),
      parsed: isTuple ? null : data,
      raw: account,
    };
  }

  public static normalizeKeyed(entry: RpcKeyedAccount): AccountInfo & { address: Address } {
    return { address: entry.pubkey as Address, ...AccountReader.normalize(entry.account) };
  }
}

function decode(data: [string, string]): Uint8Array {
  const [payload, encoding] = data;
  if (encoding === "base64") return base64Decode(payload);
  return new Uint8Array(0);
}
