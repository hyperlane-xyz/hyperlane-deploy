import { ethers } from 'ethers';
import { types, utils } from '@hyperlane-xyz/utils';
import {
  buildAgentConfig,
  ChainMap,
  ChainName,
  CoreConfig,
  GasOracleContractType,
  HyperlaneAddresses,
  HyperlaneAgentAddresses,
  MultiProvider,
  MultisigIsmConfig,
  multisigIsmVerificationCost,
  objFilter,
  objMerge,
  OverheadIgpConfig,
} from '@hyperlane-xyz/sdk';
import { chains } from '../config/chains';
import { multisigIsmConfig } from '../config/multisig_ism';
import { hyperlaneEnvironments } from '@hyperlane-xyz/sdk/dist/consts/environments';
import artifactAddresses from '../artifacts/addresses.json';

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

export function assertBalances(
  multiProvider: MultiProvider,
  chainsFunc: (argv: any) => ChainName[],
): (argv: any) => Promise<void> {
  return async (argv: any) => {
    const chains = chainsFunc(argv);
    const signer = new ethers.Wallet(argv.key);
    const address = await signer.getAddress();
    Promise.all(
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
    for (const remote of chains) {
      if (local === remote) continue;
      multisigIsmConfigs[remote] = multisigIsmConfig[remote];
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

export const sdkContractAddresses: ChainMap<HyperlaneAddresses> = {
  ...hyperlaneEnvironments.testnet,
  ...hyperlaneEnvironments.mainnet,
};

export const mergedContractAddresses: ChainMap<HyperlaneAddresses> = objMerge(
  sdkContractAddresses,
  artifactAddresses,
);

export function buildOverriddenAgentConfig(
  chains: ChainName[],
  multiProvider: MultiProvider,
  addressOverrides: ChainMap<HyperlaneAddresses>,
  startBlocks: ChainMap<number>,
) {
  const mergedAddresses: ChainMap<HyperlaneAddresses> = objMerge(
    sdkContractAddresses,
    addressOverrides,
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
    // @ts-ignore
    multiProvider,
    filteredAddresses,
    startBlocks,
  );
}
