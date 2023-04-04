import {
  ChainMap,
  HyperlaneContracts,
  MultiProvider,
  serializeContractsMap,
} from '@hyperlane-xyz/sdk';
import yargs from 'yargs';

import {
  HypERC20Config,
  HypERC20Deployer,
  TokenType,
} from '@hyperlane-xyz/hyperlane-token';
import debug from 'debug';
import { ethers } from 'ethers';
import { warpTokenConfig } from '../config/warp_tokens';
import { assertBalances, assertBytes32, getMultiProvider } from './config';
import { mergeJSON } from './json';

export async function getArgs(multiProvider: MultiProvider) {
  const args = await yargs(process.argv.slice(2))
    .describe('key', 'A hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(
      assertBalances(multiProvider, () => Object.keys(warpTokenConfig)),
    );
  return args.argv;
}

export class WarpRouteDeployer {
  constructor(
    public readonly multiProvider: MultiProvider,
    public readonly signer: ethers.Signer,
    protected readonly logger = debug('hyperlane:WarpRouteDeployer'),
  ) {}

  static async fromArgs(): Promise<WarpRouteDeployer> {
    const multiProvider = getMultiProvider();
    const { key } = await getArgs(multiProvider);
    const signer = new ethers.Wallet(key);
    multiProvider.setSharedSigner(signer);
    return new WarpRouteDeployer(multiProvider, signer);
  }

  async deploy(): Promise<void> {
    const tokenConfigs = this.getValidatedTokenConfig();
    console.log('Starting deployments');
    const deployer = new HypERC20Deployer(
      // TODO update hyperlane-token to latest to fix type error
      this.multiProvider,
      tokenConfigs,
      undefined,
    );
    await deployer.deploy();

    const deployedContracts = deployer.deployedContracts as ChainMap<
      HyperlaneContracts<any>
    >;
    const tokenAddrs = serializeContractsMap(deployedContracts);
    // Write contract address artifacts
    mergeJSON('./artifacts/', 'warp-tokens.json', tokenAddrs);
  }

  getValidatedTokenConfig(): ChainMap<HypERC20Config> {
    const targetChains = Object.keys(warpTokenConfig);
    if (!targetChains.length)
      throw new Error('No chains found in warp token config');
    // Ensure MP has config for each chain
    targetChains.forEach((chain) => this.multiProvider.getChainMetadata(chain));

    const collateralOrNativeTokens = Object.values(warpTokenConfig).filter(
      (t) => [TokenType.collateral, TokenType.native].includes(t.type),
    );
    if (collateralOrNativeTokens.length !== 1)
      throw new Error(
        'Exactly one collateral or native token must be configured',
      );

    const syntheticTokens = Object.values(warpTokenConfig).filter(
      (t) => t.type === TokenType.synthetic,
    );
    if (syntheticTokens.length < 1)
      throw new Error('At least one synthetic token must be configured');

    const uriTokens = Object.values(warpTokenConfig).filter((t) =>
      [TokenType.collateralUri, TokenType.syntheticUri].includes(t.type),
    );
    if (uriTokens.length > 0)
      throw new Error(
        'No uri tokens should be configured for an ERC20 warp route',
      );

    // TODO validate token metadata against chain

    this.logger(
      `Found token configs for ${targetChains.length} chains:`,
      targetChains.join(', '),
    );

    return warpTokenConfig;
  }
}
