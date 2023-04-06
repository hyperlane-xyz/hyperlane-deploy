import debug from 'debug';
import { ethers } from 'ethers';
import yargs from 'yargs';

import {
  ERC20Upgradeable__factory,
  ERC20__factory,
  HypERC20Config,
  HypERC20Deployer,
  HypERC20Factories,
  TokenType,
} from '@hyperlane-xyz/hyperlane-token';
import {
  ChainMap,
  ChainName,
  HyperlaneContractsMap,
  MultiProvider,
  chainMetadata,
} from '@hyperlane-xyz/sdk';
import { types } from '@hyperlane-xyz/utils';

import { warpTokenConfig } from '../../config/warp_tokens';
import {
  assertBalances,
  assertBytes32,
  getMultiProvider,
  mergedContractAddresses,
} from '../config';
import { mergeJSON, tryReadJSON, writeJSON } from '../json';

import { validateWarpTokenConfig } from './config';

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
    const { configMap, baseToken } = await this.buildHypERC20Config();

    const deployer = new HypERC20Deployer(
      this.multiProvider,
      configMap,
      undefined,
    );
    await deployer.deploy();

    this.writeDeploymentResult(
      deployer.deployedContracts,
      configMap,
      baseToken,
    );
  }

  async buildHypERC20Config() {
    validateWarpTokenConfig(warpTokenConfig);
    const { base, synthetics } = warpTokenConfig;
    const { type: baseType, chainName: baseChainName } = base;

    const baseTokenAddr =
      baseType === TokenType.collateral
        ? base.address
        : ethers.constants.AddressZero;

    const baseTokenMetadata = await this.getTokenMetadata(
      baseChainName,
      baseType,
      baseTokenAddr,
    );
    const owner = await this.signer.getAddress();

    const configMap: ChainMap<HypERC20Config> = {
      [baseChainName]: {
        type: baseType,
        token: baseTokenAddr,
        owner,
        mailbox: base.mailbox || mergedContractAddresses[baseChainName].mailbox,
        interchainGasPaymaster:
          base.interchainGasPaymaster ||
          mergedContractAddresses[baseChainName].interchainGasPaymaster,
      },
    };

    for (const synthetic of synthetics) {
      const sChainName = synthetic.chainName;
      configMap[sChainName] = {
        type: TokenType.synthetic,
        name: synthetic.name || baseTokenMetadata.name,
        symbol: synthetic.symbol || baseTokenMetadata.symbol,
        totalSupply: synthetic.totalSupply || 0,
        owner,
        mailbox:
          synthetic.mailbox || mergedContractAddresses[sChainName].mailbox,
        interchainGasPaymaster:
          synthetic.interchainGasPaymaster ||
          mergedContractAddresses[sChainName].interchainGasPaymaster,
      };
    }
    return {
      configMap,
      baseToken: {
        chainName: baseChainName,
        address: baseTokenAddr,
        metadata: baseTokenMetadata,
      },
    };
  }

  async getTokenMetadata(
    chainName: string,
    type: TokenType,
    address: types.Address,
  ) {
    if (type === TokenType.native) {
      return (
        this.multiProvider.getChainMetadata(chainName).nativeToken ||
        chainMetadata.ethereum.nativeToken!
      );
    } else if (type === TokenType.collateral || type === TokenType.synthetic) {
      const provider = this.multiProvider.getProvider(chainName);
      const erc20Contract = ERC20__factory.connect(address, provider);
      const [name, symbol, decimals] = await Promise.all([
        erc20Contract.name(),
        erc20Contract.symbol(),
        erc20Contract.decimals(),
      ]);
      return { name, symbol, decimals };
    } else {
      throw new Error(`Unsupported token type: ${type}`);
    }
  }

  writeDeploymentResult(
    contracts: HyperlaneContractsMap<HypERC20Factories>,
    configMap: ChainMap<HypERC20Config>,
    baseToken: {
      chainName: ChainName;
      address: types.Address;
      metadata: TokenMetadata;
    },
  ) {
    this.writeTokenDeploymentArtifacts(configMap, contracts);
    this.writeWarpUiTokenList(
      baseToken.chainName,
      baseToken.address,
      baseToken.metadata,
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
    baseChainName: ChainName,
    baseTokenAddress: types.Address,
    baseTokenMetadata: TokenMetadata,
    contracts: HyperlaneContractsMap<HypERC20Factories>,
  ) {
    this.logger('Writing token list for warp ui');
    const currentTokenList = tryReadJSON(
      './artifacts/',
      'warp-tokens.json',
    ) || { tokens: [] };

    const { name, symbol, decimals } = baseTokenMetadata;
    const hypTokenAddr = contracts[baseChainName].router.address;
    const newToken = {
      chainId: this.multiProvider.getChainId(baseChainName),
      address: hypTokenAddr,
      name,
      symbol,
      decimals,
      logoURI: 'SET_IMG_URL_HERE',
      hypCollateralAddress: baseTokenAddress,
    };

    currentTokenList.tokens.push(newToken);
    writeJSON('./artifacts/', 'warp-ui-token-list.json', currentTokenList);
  }

  async deployTestErc20(chain: ChainName, config: TokenMetadata) {
    this.logger('Deploying ERC20 on chain', chain, 'with config', config);
    const signer = this.multiProvider.getSigner(chain);
    const factory = new ERC20Upgradeable__factory(signer);
    const contract = await factory.deploy();
    // TODO init erc20 with config values
    return contract.address;
  }
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}