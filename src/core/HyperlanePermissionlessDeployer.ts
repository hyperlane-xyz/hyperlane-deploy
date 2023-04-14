import { ethers } from 'ethers';
import yargs from 'yargs';

import { LegacyMultisigIsm } from '@hyperlane-xyz/core';
import {
  ChainMap,
  ChainName,
  CoreFactories,
  HyperlaneAddressesMap,
  HyperlaneContractsMap,
  HyperlaneCoreDeployer,
  HyperlaneIgpDeployer,
  MultiProvider,
  defaultMultisigIsmConfigs,
  objMap,
  objMerge,
  serializeContractsMap,
} from '@hyperlane-xyz/sdk';

import { multisigIsmConfig } from '../../config/multisig_ism';
import { startBlocks } from '../../config/start_blocks';
import {
  assertBalances,
  assertBytes32,
  assertUnique,
  buildCoreConfig,
  buildIgpConfig,
  buildOverriddenAgentConfig,
  getMultiProvider,
} from '../config';
import { mergeJSON, tryReadJSON, writeJSON } from '../json';
import { createLogger } from '../logger';

import {
  HyperlaneTestRecipientDeployer,
  TestRecipientConfig,
} from './TestRecipientDeployer';

export function getArgs(multiProvider: MultiProvider) {
  // For each chain, we need:
  //   - ChainMetadata for the MultiProvider
  //   - A MultisigIsmConfig
  const { intersection } = multiProvider.intersect(
    Object.keys(objMerge(defaultMultisigIsmConfigs, multisigIsmConfig)),
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
    .middleware(assertUnique((argv) => argv.remotes.concat(argv.local)))
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
    protected readonly logger = createLogger('HyperlanePermissionlessDeployer'),
  ) {}

  static async fromArgs(): Promise<HyperlanePermissionlessDeployer> {
    const multiProvider = getMultiProvider();
    const { local, remotes, key, writeAgentConfig } = await getArgs(
      multiProvider,
    );
    if (remotes.includes(local))
      throw new Error('Local and remotes must be distinct');
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

  writeMergedAddresses(
    aAddresses: HyperlaneAddressesMap<any>,
    bContracts: HyperlaneContractsMap<any>,
  ): HyperlaneAddressesMap<any> {
    const bAddresses = serializeContractsMap(bContracts);
    const mergedAddresses = objMerge(aAddresses, bAddresses);
    this.logger(`Writing contract addresses to artifacts/addresses.json`);
    mergeJSON('./artifacts/', 'addresses.json', mergedAddresses);
    return mergedAddresses;
  }

  async deploy(): Promise<void> {
    let addresses =
      tryReadJSON<HyperlaneContractsMap<any>>(
        './artifacts',
        'addresses.json',
      ) || {};
    const owner = await this.signer.getAddress();
    // First, deploy core contracts to the local chain
    // NB: We create core configs for *all* chains because
    // we also use coreDeployer to deploy MultisigIsms.
    // Once we move that out to a HyperlaneIsmDeployer
    // we can just do:
    // const coreContracts = await coreDeployer.deploy();
    const coreConfig = buildCoreConfig(owner, this.chains);
    const coreDeployer = new HyperlaneCoreDeployer(this.multiProvider);
    coreDeployer.cacheAddressesMap(addresses);
    const coreContracts: HyperlaneContractsMap<CoreFactories> = {};
    this.logger(`Deploying core contracts to local chain ${this.local}`);
    coreContracts[this.local] = await coreDeployer.deployContracts(
      this.local,
      coreConfig[this.local],
    );
    this.logger(`Core deployment complete`);
    addresses = this.writeMergedAddresses(addresses, coreContracts);

    // Next, deploy MultisigIsms to the remote chains
    // TODO: Would be cleaner if using HyperlaneIsmDeployer
    const isms: ChainMap<MultisigIsmContracts> = {};
    isms[this.local] = {
      multisigIsm: coreContracts[this.local].multisigIsm,
    };
    for (const remote of this.remotes) {
      this.logger(`Deploying multisig ISM to chain ${remote}`);
      isms[remote] = {
        multisigIsm: await coreDeployer.deployLegacyMultisigIsm(
          remote,
          coreConfig[remote].multisigIsm,
        ),
      };
      this.logger(`Deployment of multisig ISM to chain ${remote} complete`);
    }
    this.logger(`ISM deployment complete`);
    addresses = this.writeMergedAddresses(addresses, isms);

    // Next, deploy TestRecipients to all chains
    const testRecipientConfig: ChainMap<TestRecipientConfig> = objMap(
      isms,
      (chain, ism) => {
        return { ism: ism.multisigIsm.address };
      },
    );

    this.logger(`Deploying test recipient`);
    const testRecipientDeployer = new HyperlaneTestRecipientDeployer(
      this.multiProvider,
    );
    testRecipientDeployer.cacheAddressesMap(addresses);
    const testRecipients = await testRecipientDeployer.deploy(
      testRecipientConfig,
    );
    this.logger(`Test recipient deployment complete`);
    addresses = this.writeMergedAddresses(addresses, testRecipients);

    // Finally, deploy IGPs to all chains
    // TODO: Reuse ProxyAdmin on local chain... right now *two* ProxyAdmins are deployed
    const igpConfig = buildIgpConfig(owner, this.chains);
    const igpDeployer = new HyperlaneIgpDeployer(this.multiProvider);
    igpDeployer.cacheAddressesMap(addresses);
    const igps = await igpDeployer.deploy(igpConfig);
    this.logger(`IGP deployment complete`);
    addresses = this.writeMergedAddresses(addresses, igps);

    startBlocks[this.local] = await this.multiProvider
      .getProvider(this.local)
      .getBlockNumber();

    if (this.writeAgentConfig) {
      const agentConfig = buildOverriddenAgentConfig(
        this.chains,
        this.multiProvider,
        startBlocks,
      );

      this.logger(`Writing agent config to artifacts/agent_config.json`);
      writeJSON('./artifacts/', 'agent_config.json', agentConfig);
    }
  }
}
