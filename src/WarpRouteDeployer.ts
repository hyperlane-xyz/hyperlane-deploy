import { MultiProvider } from '@hyperlane-xyz/sdk';
import yargs from 'yargs';

import { ethers } from 'ethers';
import { assertBalances, assertBytes32, getMultiProvider } from './config';

export async function getArgs(multiProvider: MultiProvider) {
  const args = await yargs(process.argv.slice(2))
    .describe('key', 'A hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(
      assertBalances(
        multiProvider,
        () => ['goerli'], // TODO),
      ),
    );
  return args.argv;
}

export class WarpRouteDeployer {
  constructor(
    public readonly multiProvider: MultiProvider,
    public readonly signer: ethers.Signer,
  ) {}

  static async fromArgs(): Promise<WarpRouteDeployer> {
    const multiProvider = getMultiProvider();
    const { key } = await getArgs(multiProvider);
    const signer = new ethers.Wallet(key);
    multiProvider.setSharedSigner(signer);

    return new WarpRouteDeployer(multiProvider, signer);
  }

  async deploy(): Promise<void> {
    // TODO
  }
}
