import {
  ChainMap,
  ChainName,
  HyperlaneCoreDeployer,
  MultiProvider,
  serializeContracts,
  HyperlaneIgpDeployer,
  objMap,
  CoreContracts,
  objMerge,
  HyperlaneAddresses,
  HyperlaneContracts,
} from '@hyperlane-xyz/sdk';
import yargs from 'yargs';

import { multisigIsmConfig } from '../config/multisig_ism';
import { ethers } from 'ethers';
import { mergeJSON, writeJSON } from './json';
import {
  assertBytes32,
  getMultiProvider,
  buildCoreConfig,
  buildIgpConfig,
  buildOverriddenAgentConfig,
  assertBalances,
} from './config';
import {
  HyperlaneTestRecipientDeployer,
  TestRecipientConfig,
} from './TestRecipientDeployer';
import { MultisigIsm } from '@hyperlane-xyz/core';
import { startBlocks } from '../config/start_blocks';

// HyperlanePermissionlessDeployer
//   Has HyperlaneCoreDeployer
//   Has HyperlaneIgpDeployer
//   Has HyperlaneTestRecipientDeployer
// Loads configs for each from yargs
//   CoreConfig -> Signer is owner + MultisigIsm from configs
//   OverheadIgpConfig -> ???
//   TestRecipientConfig -> ???
//
// 0. Configure your local chain
//      Output: Add ChainMetadata to chains.ts
// 1. Generate your validator addresses
//      Output: Add MultisigIsmConfig to multisig_ism.ts
// 2. Deploy all contracts
//      Output: Contract addresses in addresses.json, agent config in agent_config.json
// 3. Run validators
// 4. Run relayers
// 5. Send test messages

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
    ).argv;
}

type MultisigIsmContracts = {
  multisigIsm: MultisigIsm;
};

export class HyperlanePermissionlessDeployer {
  constructor(
    protected multiProvider: MultiProvider,
    protected signer: ethers.Signer,
    protected local: ChainName,
    protected remotes: ChainName[],
  ) {}

  static async fromArgs(): Promise<HyperlanePermissionlessDeployer> {
    const multiProvider = getMultiProvider();
    const { local, remotes, key } = await getArgs(multiProvider);
    const signer = new ethers.Wallet(key);
    multiProvider.setSharedSigner(signer);

    return new HyperlanePermissionlessDeployer(
      multiProvider,
      signer,
      local,
      remotes as unknown as string[],
    );
  }

  get chains(): ChainName[] {
    return this.remotes.concat([this.local]);
  }

  async deploy(): Promise<void> {
    let contracts: ChainMap<HyperlaneContracts> = {};
    const owner = await this.signer.getAddress();
    // First, deploy core contracts to the local chain
    const coreConfig = buildCoreConfig(owner, this.chains);
    const coreDeployer = new HyperlaneCoreDeployer(
      this.multiProvider,
      coreConfig,
    );
    const coreContracts: ChainMap<CoreContracts> = {};
    coreContracts[this.local] = await coreDeployer.deployContracts(
      this.local,
      coreConfig[this.local],
    );
    contracts = objMerge(contracts, coreContracts);

    // Next, deploy MultisigIsms to the remote chains
    const isms: ChainMap<MultisigIsmContracts> = {};
    isms[this.local] = {
      multisigIsm: coreContracts[this.local].multisigIsm,
    };
    for (const remote of this.remotes) {
      isms[remote] = {
        multisigIsm: await coreDeployer.deployMultisigIsm(remote),
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
    contracts = objMerge(contracts, igps);

    const addresses = serializeContracts(
      contracts,
    ) as ChainMap<HyperlaneAddresses>;
    // Write contract address artifacts
    mergeJSON('./artifacts/', 'addresses.json', addresses);

    // TODO: Need to include IGPs from other chains...
    startBlocks[this.local] = await this.multiProvider
      .getProvider(this.local)
      .getBlockNumber();

    // TODO: Add start block from local...
    const agentConfig = buildOverriddenAgentConfig(
      this.chains,
      this.multiProvider,
      addresses,
      startBlocks,
    );

    // Write AgentConfig artifacts
    writeJSON('./artifacts/', 'agent_config.json', agentConfig);
  }
}
