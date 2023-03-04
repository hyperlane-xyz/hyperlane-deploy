import {
  ChainMap,
  ChainName,
  CoreConfig,
  HyperlaneCoreDeployer,
  MultisigIsmConfig,
  CoreContracts,
  MultiProvider,
} from '@hyperlane-xyz/sdk';
import { MultisigIsm, TestRecipient__factory } from '@hyperlane-xyz/core';
import yargs from 'yargs';

import fs from 'fs';
import path from 'path';
import { mainnet, testnet } from '../config/multisig_ism';
import { ethers } from 'ethers';
import { assertKey, getMultiProvider } from './args';

export class HyperlanePermissionlessCoreDeployer extends HyperlaneCoreDeployer {
  constructor(multiProvider: MultiProvider, configMap: ChainMap<CoreConfig>) {
    super(multiProvider, configMap);
  }

  static async fromArgs(): Promise<HyperlanePermissionlessCoreDeployer> {
    const multiProvider = getMultiProvider();
    const { local, remotes, key } = await getArgs(multiProvider);
    const signer = new ethers.Wallet(key, multiProvider.getProvider(local));
    multiProvider.setSigner(local, signer);
    const multisigIsmConfigs: ChainMap<MultisigIsmConfig> = {};
    // Add the MultisigISM config for each remote chain,
    // so that it can be used to configure the local MultisigISM.
    for (const remote of remotes) {
      multisigIsmConfigs[remote] = { ...mainnet, ...testnet }[remote];
    }
    const configMap: ChainMap<CoreConfig> = {};
    configMap[local] = {
      owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      multisigIsm: multisigIsmConfigs,
    };
    return new HyperlanePermissionlessCoreDeployer(multiProvider, configMap);
  }

  get local(): ChainName {
    const chains = Object.keys(this.configMap);
    // There should only be one chain in configMap
    if (chains.length > 1) throw new Error('Found multiple configs');
    return chains[0] as ChainName;
  }

  async deploy(
    partialDeployment: ChainMap<CoreContracts> = this.deployedContracts,
  ): Promise<ChainMap<CoreContracts>> {
    const contracts = await super.deploy(partialDeployment);
    await this.deployTestRecipient(
      this.deployedContracts[this.local].multisigIsm.address,
    );
    writeJSON('./artifacts/', 'addresses.json', this.serializeContracts());
    writeJSON('./artifacts/', 'agent_config.json', this.agentConfig());
    return contracts;
  }

  async deployMultisigIsm(): Promise<MultisigIsm> {
    const contract = await super.deployMultisigIsm(this.local);
    console.log('MultisigIsm deployed to', contract.address);
    return contract;
  }

  async deployTestRecipient(ism: string) {
    const factory = new TestRecipient__factory();
    const contract = await factory
      .connect(this.multiProvider.getSigner(this.local))
      .deploy();
    const tx = contract.setInterchainSecurityModule(ism);
    await this.multiProvider.handleTx(this.local, tx);
    console.log('TestRecipient deployed to', contract.address);
  }
}

export function getArgs(multiProvider: MultiProvider) {
  const chainsWithMultisig = new Set<string>([
    ...Object.keys(mainnet),
    ...Object.keys(testnet),
  ]);
  return yargs(process.argv.slice(2))
    .describe('local', 'chain on which to deploy')
    .choices('local', multiProvider.getKnownChainNames())
    .demandOption('local')
    .describe(
      'remotes',
      'chains from which local will receive interchain messages',
    )
    .array('remotes')
    .choices('remotes', [...chainsWithMultisig])
    .demandOption('remotes')
    .describe('key', 'hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertKey)
    .demandOption('key').argv;
}

export function writeJSON(directory: string, filename: string, obj: any) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(
    path.join(directory, filename),
    JSON.stringify(obj, null, 2) + '\n',
  );
}
