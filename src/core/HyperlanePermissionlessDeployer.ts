import { ethers } from 'ethers';
import yargs from 'yargs';

import { LegacyMultisigIsm } from '@hyperlane-xyz/core';
import {
  ChainMap,
  ChainName,
  CoreFactories,
  HyperlaneContractsMap,
  HyperlaneCoreDeployer,
  HyperlaneIgpDeployer,
  MultiProvider,
  objMap,
  objMerge,
  serializeContractsMap,
} from '@hyperlane-xyz/sdk';

import { multisigIsmConfig } from '../../config/multisig_ism';
import { startBlocks } from '../../config/start_blocks';
import {
  assertBalances,
  assertBytes32,
  buildCoreConfig,
  buildIgpConfig,
  buildOverriddenAgentConfig,
  getMultiProvider,
} from '../config';
import { mergeJSON, writeJSON } from '../json';

import {
  HyperlaneTestRecipientDeployer,
  TestRecipientConfig,
} from './TestRecipientDeployer';

export function getArgs(multiProvider: MultiProvider) {
  // For each chain, we need:
  //   - ChainMetadata for the MultiProvider
  //   - A MultisigIsmConfig
  const { intersection } = multiProvider.intersect(
    Object.keys(multisigIsmConfig),
  );

  return yargs(process.argv.slice(2))
    .describe('local', 'The chain to deploy to')
    .choices('local', intersection)
    .demandOption('local')
    .array('remotes')
    .describe(
      'remotes',
      "The chains with which 'local' will be able to send and receive messages",
    )
    .choices('remotes', intersection)
    .demandOption('remotes')
    .describe('key', 'A hexadecimal private key for transaction signing')
    .string('key')
    .coerce('key', assertBytes32)
    .demandOption('key')
    .middleware(
      assertBalances(multiProvider, (argv) => argv.remotes.concat(argv.local)),
    )
    .describe('write-agent-config', 'Whether or not to write agent config')
    .default('write-agent-config', true)
    .boolean('write-agent-config').argv;
}

type MultisigIsmContracts = {
  multisigIsm: LegacyMultisigIsm;
};

export class HyperlanePermissionlessDeployer {
  constructor(
    public readonly multiProvider: MultiProvider,
    public readonly signer: ethers.Signer,
    public readonly local: ChainName,
    public readonly remotes: ChainName[],
    public readonly writeAgentConfig?: boolean,
  ) {}

  static async fromArgs(): Promise<HyperlanePermissionlessDeployer> {
    const multiProvider = getMultiProvider();
    const { local, remotes, key, writeAgentConfig } = await getArgs(
      multiProvider,
    );
    const signer = new ethers.Wallet(key);
    multiProvider.setSharedSigner(signer);

    return new HyperlanePermissionlessDeployer(
      multiProvider,
      signer,
      local,
      remotes as unknown as string[],
      writeAgentConfig,
    );
  }

  get chains(): ChainName[] {
    return this.remotes.concat([this.local]);
  }

  async deploy(): Promise<void> {
    let contracts: HyperlaneContractsMap<CoreFactories> = {};
    const owner = await this.signer.getAddress();
    // First, deploy core contracts to the local chain
    // NB: We create core configs for *all* chains because
    // we also use coreDeployer to deploy MultisigIsms.
    // Once we move that out to a HyperlaneIsmDeployer
    // we can just do:
    // const coreContracts = await coreDeployer.deploy();
    const coreConfig = buildCoreConfig(owner, this.chains);
    const coreDeployer = new HyperlaneCoreDeployer(
      this.multiProvider,
      coreConfig,
    );
    const coreContracts: HyperlaneContractsMap<CoreFactories> = {};
    coreContracts[this.local] = await coreDeployer.deployContracts(
      this.local,
      coreConfig[this.local],
    );
    contracts = objMerge(contracts, coreContracts);

    // Next, deploy MultisigIsms to the remote chains
    // TODO: Would be cleaner if using HyperlaneIsmDeployer
    const isms: ChainMap<MultisigIsmContracts> = {};
    isms[this.local] = {
      multisigIsm: coreContracts[this.local].multisigIsm,
    };
    for (const remote of this.remotes) {
      isms[remote] = {
        multisigIsm: await coreDeployer.deployLegacyMultisigIsm(remote),
      };
    }
    contracts = objMerge(contracts, isms);

    // Next, deploy TestRecipients to all chains
    const testRecipientConfig: ChainMap<TestRecipientConfig> = objMap(
      isms,
      (chain, ism) => {
        return { ism: ism.multisigIsm.address };
      },
    );
    const testRecipientDeployer = new HyperlaneTestRecipientDeployer(
      this.multiProvider,
      testRecipientConfig,
    );
    const testRecipients = await testRecipientDeployer.deploy();
    contracts = objMerge(contracts, testRecipients);

    // Finally, deploy IGPs to all chains
    // TODO: Reuse ProxyAdmin on local chain... right now *two* ProxyAdmins are deployed
    const igpConfig = buildIgpConfig(owner, this.chains);
    const igpDeployer = new HyperlaneIgpDeployer(this.multiProvider, igpConfig);
    const igps = await igpDeployer.deploy();
    /*
    for (const chain in Object.keys(igps)) {
      const storageGasOracle = igps[chain].storageGasOracle;

    }
    */

    contracts = objMerge(contracts, igps);

    const addresses = serializeContractsMap(contracts);
    // Write contract address artifacts
    mergeJSON('./artifacts/', 'addresses.json', addresses);

    startBlocks[this.local] = await this.multiProvider
      .getProvider(this.local)
      .getBlockNumber();

    if (this.writeAgentConfig) {
      const agentConfig = buildOverriddenAgentConfig(
        this.chains,
        this.multiProvider,
        startBlocks,
      );

      // Write AgentConfig artifacts
      writeJSON('./artifacts/', 'agent_config.json', agentConfig);
    }
  }
}
