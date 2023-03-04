import { ethers } from 'ethers';
import { chains } from '../config/chains';
import { utils } from '@hyperlane-xyz/utils';
import { MultiProvider } from '@hyperlane-xyz/sdk';

export function getMultiProvider() {
  const multiProvider = new MultiProvider();
  for (const metadata of Object.values(chains)) {
    multiProvider.addChain(metadata);
  }
  return multiProvider;
}
export function assertBytes32(value: string): string {
  if (
    ethers.utils.isHexString(value) &&
    ethers.utils.hexDataLength(value) == 32
  ) {
    return value;
  }
  throw new Error(`Invalid value ${value}, must be a 32 byte hex string`);
}

export function coerceAddressToBytes32(value: string): string {
  if (ethers.utils.isHexString(value)) {
    const length = ethers.utils.hexDataLength(value);
    if (length == 32) {
      return value;
    } else if (length == 20) {
      return utils.addressToBytes32(value);
    }
  }
  throw new Error(`Invalid value ${value}, must be a 20 or 32 byte hex string`);
}
