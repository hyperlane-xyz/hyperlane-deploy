import { ethers } from 'ethers';
import yargs from 'yargs';

import {
  ERC20__factory,
  HypERC20Deployer,
  HypERC20Factories,
  TokenConfig,
  TokenType,
} from '@hyperlane-xyz/hyperlane-token';
import {
  ChainMap,
  ChainName,
  HyperlaneContractsMap,
  MultiProvider,
  RouterConfig,
  chainMetadata,
  objMap,
} from '@hyperlane-xyz/sdk';
import { types } from '@hyperlane-xyz/utils';

import { warpRouteConfig } from '../../config/warp_tokens';
import {
  assertBalances,
  assertBytes32,
  getMultiProvider,
  mergedContractAddresses,
} from '../config';
import { mergeJSON, tryReadJSON, writeFileAtPath, writeJSON } from '../json';
import { createLogger } from '../logger';

import { getWarpConfigChains, validateWarpTokenConfig } from './config';
import { TokenMetadata, WarpUITokenConfig } from './types';

export async function getArgs(multiProvider: MultiProvider) {
  const args = await yargs(process.argv.slice(2))
    .describe('key', 'A hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(
      assertBalances(multiProvider, () => getWarpConfigChains(warpRouteConfig)),
    );
  return args.argv;
}

export type WarpRouteArtifacts = {
  router: types.Address;
  tokenType: TokenType;
};

export class WarpRouteDeployer {
  constructor(
    public readonly multiProvider: MultiProvider,
    public readonly signer: ethers.Signer,
    protected readonly logger = createLogger('WarpRouteDeployer'),
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

    this.logger('Initiating HypERC20 deployments');
    const deployer = new HypERC20Deployer(this.multiProvider);
    await deployer.deploy(configMap);
    this.logger('HypERC20 deployments complete');

    this.writeDeploymentResult(
      deployer.deployedContracts,
      configMap,
      baseToken,
    );
  }

  async buildHypERC20Config() {
    validateWarpTokenConfig(warpRouteConfig);
    const { base, synthetics } = warpRouteConfig;
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
    this.logger(
      `Using base token metadata: Name: ${baseTokenMetadata.name}, Symbol: ${baseTokenMetadata.symbol}, Decimals: ${baseTokenMetadata.decimals} `,
    );
    const owner = await this.signer.getAddress();

    const configMap: ChainMap<TokenConfig & RouterConfig> = {
      [baseChainName]: {
        type: baseType,
        token: baseTokenAddr,
        owner,
        mailbox: base.mailbox || mergedContractAddresses[baseChainName].mailbox,
        interchainSecurityModule:
          base.interchainSecurityModule ||
          mergedContractAddresses[baseChainName].multisigIsm,
        interchainGasPaymaster:
          base.interchainGasPaymaster ||
          mergedContractAddresses[baseChainName]
            .defaultIsmInterchainGasPaymaster,
      },
    };
    this.logger(
      `HypERC20Config config on base chain ${baseChainName}:`,
      JSON.stringify(configMap[baseChainName]),
    );

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
        interchainSecurityModule:
          synthetic.interchainSecurityModule ||
          mergedContractAddresses[sChainName].multisigIsm,
        interchainGasPaymaster:
          synthetic.interchainGasPaymaster ||
          mergedContractAddresses[sChainName].defaultIsmInterchainGasPaymaster,
      };
      this.logger(
        `HypERC20Config config on synthetic chain ${sChainName}:`,
        JSON.stringify(configMap[sChainName]),
      );
    }
    return {
      configMap,
      baseToken: {
        type: baseType,
        chainName: baseChainName,
        address: baseTokenAddr,
        metadata: baseTokenMetadata,
      },
    };
  }

  async getTokenMetadata(
    chain: ChainName,
    type: TokenType,
    address: types.Address,
  ): Promise<TokenMetadata> {
    if (type === TokenType.native) {
      return (
        this.multiProvider.getChainMetadata(chain).nativeToken ||
        chainMetadata.ethereum.nativeToken!
      );
    } else if (type === TokenType.collateral || type === TokenType.synthetic) {
      this.logger(`Fetching token metadata for ${address} on ${chain}}`);
      const provider = this.multiProvider.getProvider(chain);
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
    configMap: ChainMap<TokenConfig & RouterConfig>,
    baseToken: Awaited<
      ReturnType<typeof this.buildHypERC20Config>
    >['baseToken'],
  ) {
    this.writeTokenDeploymentArtifacts(contracts, configMap);
    this.writeWarpUiTokenList(contracts, baseToken);
  }

  writeTokenDeploymentArtifacts(
    contracts: HyperlaneContractsMap<HypERC20Factories>,
    configMap: ChainMap<TokenConfig & RouterConfig>,
  ) {
    this.logger(
      'Writing token deployment addresses to artifacts/warp-token-addresses.json',
    );
    const artifacts: ChainMap<WarpRouteArtifacts> = objMap(
      contracts,
      (chain, contract) => {
        return {
          router: contract.router.address,
          tokenType: configMap[chain].type,
        };
      },
    );
    mergeJSON('./artifacts/', 'warp-token-addresses.json', artifacts);
  }

  writeWarpUiTokenList(
    contracts: HyperlaneContractsMap<HypERC20Factories>,
    baseToken: Awaited<
      ReturnType<typeof this.buildHypERC20Config>
    >['baseToken'],
  ) {
    this.logger(
      'Writing warp ui token list to artifacts/warp-ui-token-list.json and artifacts/warp-ui-token-list.ts',
    );
    const currentTokenList: WarpUITokenConfig[] =
      tryReadJSON('./artifacts/', 'warp-ui-token-list.json') || [];

    const { type, address, chainName, metadata } = baseToken;
    const { name, symbol, decimals } = metadata;
    const hypTokenAddr = contracts[chainName].router.address;
    const commonFields = {
      chainId: this.multiProvider.getChainId(chainName),
      name,
      symbol,
      decimals,
    };
    let newToken: WarpUITokenConfig;
    if (type === TokenType.collateral) {
      newToken = {
        ...commonFields,
        type: TokenType.collateral,
        address,
        hypCollateralAddress: hypTokenAddr,
      };
    } else if (type === TokenType.native) {
      newToken = {
        ...commonFields,
        type: TokenType.native,
        hypNativeAddress: hypTokenAddr,
      };
    } else {
      throw new Error(`Unsupported token type: ${type}`);
    }

    currentTokenList.push(newToken);
    // Write list as JSON
    writeJSON('./artifacts/', 'warp-ui-token-list.json', currentTokenList);
    // Also write list as TS
    const serializedTokens = currentTokenList
      .map((t) => JSON.stringify(t))
      .join(',\n');
    writeFileAtPath(
      './artifacts/',
      'warp-ui-token-list.ts',
      `export const tokenList = [\n${serializedTokens}\n];`,
    );
  }
}
