import {
  ChainMap,
  ChainName,
  HyperlaneContractsMap,
  MultiProvider,
  chainMetadata,
} from '@hyperlane-xyz/sdk';
import { types } from '@hyperlane-xyz/utils';
import yargs from 'yargs';

import {
  ERC20Upgradeable__factory,
  ERC20__factory,
  HypERC20Config,
  HypERC20Deployer,
  HypERC20Factories,
  TokenType,
} from '@hyperlane-xyz/hyperlane-token';
import debug from 'debug';
import { ethers } from 'ethers';
import { warpTokenConfig } from '../config/warp_tokens';
import { assertBalances, assertBytes32, getMultiProvider } from './config';
import { mergeJSON, tryReadJSON, writeJSON } from './json';

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
    const { tokenConfigs, originToken, originChainName, originTokenMetadata } =
      await this.validateTokenConfig();

    const deployer = new HypERC20Deployer(
      this.multiProvider,
      tokenConfigs,
      undefined,
    );
    await deployer.deploy();

    this.writeDeploymentResult(
      tokenConfigs,
      originChainName,
      originToken,
      originTokenMetadata,
      deployer.deployedContracts,
    );
  }

  async validateTokenConfig() {
    const tokenConfigs = Object.entries(warpTokenConfig);
    if (!tokenConfigs.length)
      throw new Error('No chains found in warp token config');

    this.logger(`Found token configs for ${tokenConfigs.length} chains`);

    // Ensure MP has config for each chain
    tokenConfigs.forEach(([chain]) =>
      this.multiProvider.getChainMetadata(chain),
    );

    const collateralOrNativeTokens = tokenConfigs.filter((t) =>
      [TokenType.collateral, TokenType.native].includes(t[1].type),
    );
    if (collateralOrNativeTokens.length !== 1)
      throw new Error(
        'Exactly one collateral or native token must be configured',
      );
    const originChainName = collateralOrNativeTokens[0][0];
    const originToken = collateralOrNativeTokens[0][1];
    const originTokenAddr =
      originToken.type === TokenType.collateral
        ? originToken.token
        : ethers.constants.AddressZero;

    const syntheticTokens = tokenConfigs.filter(
      (t) => t[1].type === TokenType.synthetic,
    );
    if (syntheticTokens.length < 1)
      throw new Error('At least one synthetic token must be configured');
    const destChainNames = syntheticTokens.map((t) => t[0]);

    const uriTokens = tokenConfigs.filter((t) =>
      [TokenType.collateralUri, TokenType.syntheticUri].includes(t[1].type),
    );
    if (uriTokens.length > 0)
      throw new Error(
        'No uri tokens should be configured for an ERC20 warp route',
      );

    const originTokenMetadata = await this.getTokenMetadata(
      originChainName,
      originToken,
      originTokenAddr,
    );

    return {
      tokenConfigs: warpTokenConfig,
      originChainName,
      originToken,
      originTokenMetadata,
      destChainNames,
    };
  }

  async getTokenMetadata(
    chainName: string,
    token: HypERC20Config,
    address: types.Address,
  ) {
    if (token.type === TokenType.native) {
      return (
        this.multiProvider.getChainMetadata(chainName).nativeToken ||
        chainMetadata.ethereum.nativeToken!
      );
    } else if (
      token.type === TokenType.collateral ||
      token.type === TokenType.synthetic
    ) {
      const provider = this.multiProvider.getProvider(chainName);
      const erc20Contract = ERC20__factory.connect(address, provider);
      const [name, symbol, decimals] = await Promise.all([
        erc20Contract.name(),
        erc20Contract.symbol(),
        erc20Contract.decimals(),
      ]);
      return { name, symbol, decimals };
    } else {
      throw new Error(`Unsupported token type: ${token.type}`);
    }
  }

  writeDeploymentResult(
    tokenConfigs: ChainMap<HypERC20Config>,
    originChainName: ChainName,
    originToken: HypERC20Config,
    originTokenMetadata: TokenMetadata,
    contracts: HyperlaneContractsMap<HypERC20Factories>,
  ) {
    this.writeTokenDeploymentArtifacts(tokenConfigs, contracts);
    this.writeWarpUiTokenList(
      originChainName,
      originToken,
      originTokenMetadata,
      contracts,
    );
  }

  writeTokenDeploymentArtifacts(
    tokenConfigs: ChainMap<HypERC20Config>,
    contracts: HyperlaneContractsMap<HypERC20Factories>,
  ) {
    this.logger('Writing token deployment artifacts');
    const tokenAddrs: ChainMap<Record<string, TokenType>> = {};
    for (const [chainName, factory] of Object.entries(contracts)) {
      const tokenType = tokenConfigs[chainName].type;
      const tokenAddr = factory.router.address;
      this.logger(
        `Token type ${tokenType} has address to ${tokenAddr} on ${chainName}`,
      );
      // Using a map here so it's mergeJson friendly
      tokenAddrs[chainName] = { [factory.router.address]: tokenType };
    }
    mergeJSON('./artifacts/', 'warp-token-addresses.json', tokenAddrs);
  }

  writeWarpUiTokenList(
    originChainName: ChainName,
    originToken: HypERC20Config,
    originTokenMetadata: TokenMetadata,
    contracts: HyperlaneContractsMap<HypERC20Factories>,
  ) {
    this.logger('Writing token list for warp ui');
    const currentTokenList = tryReadJSON(
      './artifacts/',
      'warp-tokens.json',
    ) || { tokens: [] };

    const { name, symbol, decimals } = originTokenMetadata;
    const hypTokenAddr = contracts[originChainName].router.address;
    const hypCollateralAddress =
      originToken.type === TokenType.collateral
        ? originToken.token
        : ethers.constants.AddressZero;
    const newToken = {
      chainId: this.multiProvider.getChainId(originChainName),
      address: hypTokenAddr,
      name,
      symbol,
      decimals,
      logoURI: 'SET_IMG_URL_HERE',
      hypCollateralAddress,
    };

    currentTokenList.tokens.push(newToken);
    writeJSON('./artifacts/', 'warp-ui-token-list.json', currentTokenList);
  }

  // Use only for development
  async deployTestErc20(chain: ChainName, config: TokenMetadata) {
    this.logger('Deploying ERC20 on chain', chain, 'with config', config);
    const signer = this.multiProvider.getSigner(chain);
    const factory = new ERC20Upgradeable__factory(signer);
    const contract = await factory.deploy();
    return contract.address;
  }
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}
