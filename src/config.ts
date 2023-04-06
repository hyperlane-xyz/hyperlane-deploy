import { HypERC20Config } from '@hyperlane-xyz/hyperlane-token';
import {
  buildAgentConfig,
  ChainMap,
  chainMetadata,
  ChainName,
  CoreConfig,
  defaultMultisigIsmConfigs,
  GasOracleContractType,
  HyperlaneAddressesMap,
  HyperlaneAgentAddresses,
  MultiProvider,
  MultisigIsmConfig,
  multisigIsmVerificationCost,
  objFilter,
  objMerge,
  OverheadIgpConfig,
} from '@hyperlane-xyz/sdk';
import { hyperlaneEnvironments } from '@hyperlane-xyz/sdk/dist/consts/environments';
import { types, utils } from '@hyperlane-xyz/utils';
import { ethers } from 'ethers';
import artifactAddresses from '../artifacts/addresses.json';
import { chains } from '../config/chains';
import { multisigIsmConfig } from '../config/multisig_ism';
import { warpTokenConfig } from '../config/warp_tokens';
import { readJSON } from './json';

let multiProvider: MultiProvider;

export function getMultiProvider() {
  if (!multiProvider) {
    const chainConfigs = { ...chainMetadata, ...chains };
    multiProvider = new MultiProvider(chainConfigs);
  }
  return multiProvider;
}
export function assertBytesN(value: string, length: number): string {
  if (
    ethers.utils.isHexString(value) &&
    ethers.utils.hexDataLength(value) == length
  ) {
    return value;
  }
  throw new Error(
    `Invalid value ${value}, must be a ${length} byte hex string`,
  );
}

export function assertBytes32(value: string): string {
  return assertBytesN(value, 32);
}

export function assertBytes20(value: string): string {
  return assertBytesN(value, 20);
}

export function assertBalances(
  multiProvider: MultiProvider,
  chainsFunc: (argv: any) => ChainName[],
): (argv: any) => Promise<void> {
  return async (argv: any) => {
    const chains = chainsFunc(argv);
    const signer = new ethers.Wallet(argv.key);
    const address = await signer.getAddress();
    await Promise.all(
      chains.map(async (chain: ChainName) => {
        const balance = await multiProvider
          .getProvider(chain)
          .getBalance(address);
        if (balance.isZero())
          throw new Error(`${address} has no balance on ${chain}`);
      }),
    );
  };
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

export function buildCoreConfig(
  owner: types.Address,
  chains: ChainName[],
): ChainMap<CoreConfig> {
  const configMap: ChainMap<CoreConfig> = {};
  for (const local of chains) {
    const multisigIsmConfigs: ChainMap<MultisigIsmConfig> = {};
    const mergedMultisigIsmConfig: ChainMap<MultisigIsmConfig> = objMerge(
      defaultMultisigIsmConfigs,
      multisigIsmConfig,
    );
    for (const remote of chains) {
      if (local === remote) continue;
      multisigIsmConfigs[remote] = mergedMultisigIsmConfig[remote];
    }
    configMap[local] = {
      owner,
      multisigIsm: multisigIsmConfigs,
    };
  }
  return configMap;
}

export function buildIgpConfig(
  owner: types.Address,
  chains: ChainName[],
): ChainMap<OverheadIgpConfig> {
  const configMap: ChainMap<OverheadIgpConfig> = {};
  for (const local of chains) {
    const overhead: ChainMap<number> = {};
    const gasOracleType: ChainMap<GasOracleContractType> = {};
    for (const remote of chains) {
      if (local === remote) continue;
      overhead[remote] = multisigIsmVerificationCost(
        multisigIsmConfig[remote].threshold,
        multisigIsmConfig[remote].validators.length,
      );
      gasOracleType[remote] = GasOracleContractType.StorageGasOracle;
    }
    configMap[local] = {
      owner,
      beneficiary: owner,
      gasOracleType,
      overhead,
    };
  }
  return configMap;
}

export const sdkContractAddresses = {
  ...hyperlaneEnvironments.testnet,
  ...hyperlaneEnvironments.mainnet,
};

export const mergedContractAddresses = objMerge(
  sdkContractAddresses,
  artifactAddresses,
);

export function buildOverriddenAgentConfig(
  chains: ChainName[],
  multiProvider: MultiProvider,
  startBlocks: ChainMap<number>,
) {
  const localAddresses = readJSON('./artifacts', 'addresses.json');
  const mergedAddresses: HyperlaneAddressesMap<any> = objMerge(
    sdkContractAddresses,
    localAddresses,
  );
  const filteredAddresses: ChainMap<HyperlaneAgentAddresses> = objFilter(
    mergedAddresses,
    (chain, v): v is HyperlaneAgentAddresses =>
      chains.includes(chain) &&
      !!v.mailbox &&
      !!v.interchainGasPaymaster &&
      !!v.validatorAnnounce,
  );

  return buildAgentConfig(
    chains,
    multiProvider,
    filteredAddresses,
    startBlocks,
  );
}

export function buildHypERC20Config(
  owner: types.Address,
): ChainMap<HypERC20Config> {
  const configMap: ChainMap<HypERC20Config> = {};
  for (const chain of Object.keys(warpTokenConfig)) {
    configMap[chain] = {
      ...warpTokenConfig[chain],
      owner,
      mailbox: mergedContractAddresses[chain].mailbox,
      interchainGasPaymaster:
        mergedContractAddresses[chain].interchainGasPaymaster,
    };
  }
  return configMap;
}
