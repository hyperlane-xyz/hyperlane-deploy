import { MultiProvider } from '@hyperlane-xyz/sdk';
import { ethers } from 'ethers';
import yargs from 'yargs';
import {
  assertBalances,
  assertBytes32,
  getMultiProvider,
  mergedContractAddresses,
} from '../src/config';

export function getArgs(multiProvider: MultiProvider) {
  // Only accept chains for which we have both a connection and contract addresses
  const { intersection } = multiProvider.intersect(
    Object.keys(mergedContractAddresses),
  );
  return yargs(process.argv.slice(2))
    .describe('origin', 'chain to send tokens from')
    .choices('origin', intersection)
    .demandOption('origin')
    .string('origin')
    .describe('destination', 'chain to send tokens to')
    .choices('destination', intersection)
    .demandOption('destination')
    .string('destination')
    .describe('wei', 'amount in wei to send')
    .demandOption('wei')
    .number('wei')
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .describe('timeout', 'timeout in seconds')
    .number('timeout')
    .default('timeout', 10 * 60)
    .middleware(assertBalances(multiProvider, (argv) => argv.origin)).argv;
}

// TODO DRY up with test-messages s
async function main() {
  let timedOut = false;
  const multiProvider = getMultiProvider();
  const { origin, destination, wei, key, timeout } = await getArgs(
    multiProvider,
  );
  const timeoutId = setTimeout(() => {
    timedOut = true;
  }, timeout * 1000);
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);

  // TODO send transfer

  clearTimeout(timeoutId);
  if (timedOut) {
    console.error('Timed out waiting for messages to be delivered');
    process.exit(1);
  }
}

main()
  .then(() => console.info('Warp test transfer complete'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
